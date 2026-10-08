# Catalyst OS Architecture: Startup Memory System

This document outlines the architecture, data structures, storage schemas, and semantic search integration for the **Startup Memory System**. This system provides persistent, context-aware memory to the CEO and specialized executive agents, tracking past decisions, commands, meeting notes, strategies, and recommendations using a hybrid relational/vector architecture.

---

## 1. System Topology & Memory Flow

The Startup Memory System captures structural operational records (from decisions and commands) and unstructured text inputs (from meeting notes and strategies), parses them, generates high-dimensional embeddings, and stores them in a hybrid database (PostgreSQL + pgvector).

```text
 [Input Stream]
  ├─► Past Decisions (Structured Ledger)
  ├─► Founder Commands (System Commands Log)
  ├─► Meeting Notes (Transcripts / Text docs)
  ├─► Previous Strategies (Markdown Briefs)
  └─► Executive Recommendations (Agent Outputs)
         │
         ▼
 1. Memory ingestion Engine ──► Tags with Metadata (Temporal, Actor, Category)
         │
         ▼
 2. Chunking & Tokenizer ──► Handles long transcripts (500 tokens, 15% overlap)
         │
         ▼
 3. Text-Embedding Generator ──► text-embedding-004 (Google GenAI SDK)
         │
         ▼
 4. Hybrid Database Layer
         ├─► Relational Store (PostgreSQL) ──► Immutable logs, indexes, metadata
         └─► Vector Store (pgvector)       ──► 768-dimension embeddings
         │
         ▼
 5. Semantic Retrieval Search (Cosine Distance / Hybrid BM25 Search)
         │
         ▼
 [Contextual Agent Memory] ──► Injected into Active Prompt Window
```

---

## 2. PostgreSQL Relational & Vector Database Schema

To support dual querying (structured relational filters + semantic vector searches), the memory database uses the following PostgreSQL layout with `pgvector` enabled:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Enum for Memory Types
CREATE TYPE memory_category AS ENUM (
    'decision',
    'founder_command',
    'meeting_note',
    'strategy_brief',
    'agent_recommendation'
);

-- 2. Master Startup Memory Table
CREATE TABLE startup_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL,
    category memory_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Core body of the memory
    actor VARCHAR(100) NOT NULL, -- e.g., 'Sophia Vance (CEO)', 'Siddharth (Founder)'
    financial_impact DECIMAL(15, 2) DEFAULT 0.00,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"page": 2, "meeting_date": "2026-06-15"}
    embedding vector(768) NOT NULL, -- High-dimensional semantic coordinate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for Hyper-speed Retrieval
-- HNSW index for high-dimensional vector search
CREATE INDEX ON startup_memories USING hnsw (embedding vector_cosine_ops);

-- B-Tree indexes for standard relational pre-filtering
CREATE INDEX idx_memories_startup ON startup_memories(startup_id);
CREATE INDEX idx_memories_category ON startup_memories(category);
CREATE INDEX idx_memories_created ON startup_memories(created_at);
```

---

## 3. Backend Implementation & RAG Search Routes (Node.js)

The memory system is served by modular Express/FastAPI handlers that coordinate writing records, creating embeddings, and searching stored memories.

### Express API Route Handler (`/backend/routes/memory.ts`)

```typescript
import { Router } from 'express';
import { ai } from '../services/geminiService';
// Assuming a pool connection to PostgreSQL (e.g., using pg/slonik/drizzle)
import { db } from '../db'; 

const router = Router();

/**
 * 1. POST /api/memory - Save a new memory
 * Automatically generates vector embedding and persists into pg
 */
router.post('/memory', async (req, res) => {
  const { title, content, category, actor, financialImpact, metadata } = req.body;
  const startupId = req.headers['x-startup-id'] || '0404b094-7555-4e20-9413-23f92a4ea1e5';

  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Missing core memory parameters.' });
  }

  try {
    let embedding: number[] = new Array(768).fill(0);

    // Call Google GenAI Embeddings API if initialized
    if (ai) {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: `${title}\n${content}`,
      });
      if (response.embedding?.values) {
        embedding = response.embedding.values;
      }
    }

    // Insert into PostgreSQL
    const queryText = `
      INSERT INTO startup_memories (startup_id, category, title, content, actor, financial_impact, metadata, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at;
    `;

    const values = [
      startupId,
      category,
      title,
      content,
      actor || 'System',
      financialImpact || 0.00,
      JSON.stringify(metadata || {}),
      JSON.stringify(embedding)
    ];

    const result = await db.query(queryText, values);
    return res.status(201).json({
      success: true,
      memoryId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  } catch (error: any) {
    console.error('Error saving startup memory:', error);
    return res.status(500).json({ error: 'Failed to record startup memory.' });
  }
});

/**
 * 2. POST /api/memory/query - Semantic search over memory
 * Inputs a query string and returns highly relevant cited memories using cosine distance
 */
router.post('/memory/query', async (req, res) => {
  const { query, categories, limit = 5 } = req.body;
  const startupId = req.headers['x-startup-id'] || '0404b094-7555-4e20-9413-23f92a4ea1e5';

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    let queryEmbedding: number[] = new Array(768).fill(0);

    if (ai) {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query,
      });
      if (response.embedding?.values) {
        queryEmbedding = response.embedding.values;
      }
    }

    // Build query with optional category filtering
    let categoryFilter = '';
    const values: any[] = [startupId, JSON.stringify(queryEmbedding), limit];

    if (categories && Array.isArray(categories) && categories.length > 0) {
      categoryFilter = 'AND category = ANY($4)';
      values.push(categories);
    }

    const sql = `
      SELECT id, title, content, category, actor, financial_impact, metadata, created_at,
             (embedding <=> $2::vector) as distance
      FROM startup_memories
      WHERE startup_id = $1 ${categoryFilter}
      ORDER BY embedding <=> $2::vector ASC
      LIMIT $3;
    `;

    const result = await db.query(sql, values);
    
    // Normalize cosine distance to a similarity score [0 - 1]
    const memories = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      actor: row.actor,
      financialImpact: parseFloat(row.financial_impact),
      metadata: row.metadata,
      createdAt: row.created_at,
      score: parseFloat((1 - row.distance).toFixed(4)),
    }));

    return res.json({ query, results: memories });
  } catch (error: any) {
    console.error('Error executing semantic memory query:', error);
    return res.status(500).json({ error: 'Failed to query startup memories.' });
  }
});

export default router;
```

---

## 4. Multi-Agent Memory Retrieval Loop

When an executive agent evaluates an initiative, they query the **Startup Memory System** first. Below is the workflow schema executed by the CEO Agent when looking up past hiring decisions:

```text
Founder Prompt: "We need to hire a lead cloud engineer. Did we make any similar hiring decisions?"
      │
      ▼
1. CEO Agent extracts intent parameters:
   - Query: "Hiring engineer compensation options pool"
   - Category filtering: ['decision', 'strategy_brief']
      │
      ▼
2. Call API: `POST /api/memory/query`
      │
      ▼
3. PostgreSQL performs semantic vector match against historical logs.
   Returns: "Approve: Lead Platform Architect Offer on 2026-06-30 ($132k Base, 1.3% Equity)."
      │
      ▼
4. Synthesis Prompt:
   "Our memory shows we closed a Lead Platform Architect on 2026-06-30. Compensation structure was:
    - Base Salary: $132,000
    - Equity Pool: 1.3% options
    We should model the lead cloud engineer following similar compensation bounds."
```

---

## 5. Security & Isolation Controls

- **Multi-Tenant Boundaries**: Every database query explicitly restricts by `startup_id`. Vector embeddings cannot bleed between separate startup operations.
- **Role-Based Privacy**: Sensitive financial and cap-table files or board-meeting notes can be restricted to authorized roles (e.g. only accessible by the 'CEO' and 'Finance' agents).
- **Data Integrity**: Memories of approved human decisions are immutable. The system prevents editing or deleting recorded items in the `startup_memories` table to protect historic audit records.
