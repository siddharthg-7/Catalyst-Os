# FounderOS Architecture: RAG Pipeline & Document Ingestion

This document details the production-ready retrieval-augmented generation (RAG) architecture for indexing, chunking, and searching company-knowledge documents (Pitch Decks, Business Plans, financials, SOPs, and policies).

---

## 1. Macro RAG Architecture

The RAG pipeline provides context-awareness to the CEO Planner and specialized agents, ensuring all decisions align with actual startup goals and historical guidelines.

```text
  [Document Upload] ── (Pitch Decks, financials, SOPs, CSVs)
         │
         ▼
 1. Document Parser ── Ingest text / PDF tables / Markdown
         │
         ▼
 2. Chunking Engine ── Recursive Character Splitting (500 tokens, 10% overlap)
         │
         ▼
 3. Embedding Generator ── Text-Embedding-004 (Google Vertex AI)
         │
         ▼
 4. Vector Database ── PostgreSQL (pgvector) / Firestore Native Vector
         │
         ▼
 5. Semantic Search Vector Match (Cosine Similarity)
         │
         ▼
 6. Context Ranker (Cohere Rerank / Cross-Encoder)
         │
         ▼
 7. Structured Prompt Context with Citation References
```

---

## 2. Chunking & Ingestion Strategy

To maintain semantic cohesiveness, document indexing utilizes a **Hierarchical and Semantic Chunking Strategy**:

- **Chunk Size**: 500 tokens (approx. 350-400 words) to ensure local context is fully captured without diluting details.
- **Overlap**: 50 tokens (10% overlap) to prevent losing information at chunk borders.
- **Hierarchical Indexing**: Large documents (e.g., a 40-page Business Plan) are divided into high-level summaries pointing to individual child chunks.
- **Metadata Tagging**: Each chunk is indexed with exhaustive metadata fields to allow pre-filtering during queries:
  ```typescript
  interface DocumentChunk {
    chunkId: string;
    documentId: string;
    documentName: string;
    documentType: 'pitch_deck' | 'financials' | 'sop' | 'policy' | 'roadmap';
    content: string;
    embedding: number[];  // 768-dimension vector
    metadata: {
      tags: string[];
      pageNumber?: number;
      sectionTitle?: string;
      uploadDate: string;
    };
  }
  ```

---

## 3. Retrieval & Semantic Search Querying

Retrieval queries are handled via a multi-document search engine to gather holistic answers:

- **Vector Distance metric**: Cosine Similarity.
- **Multi-Document Retrieval**: Search queries are executed concurrently across different document categories (e.g. searching both `financials` and `roadmap` when deciding on hiring timelines).
- **Context Ranking & Re-ranking**: Retrieved chunks undergo scoring:
  1. **Keyword Match (BM25)** is blended with **Semantic Vector Match** (Hybrid Search) to capture exact numerical terms and conceptual intents.
  2. The top 15 results are sent to a **Cross-Encoder Ranker** to bubble up the 5 most relevant segments.

---

## 4. Citation Support & Agent Prompts

To prevent hallucinations, agents must cite source documents. The prompt generator formats retrieved context like this:

```markdown
Use the following corporate document excerpts to answer the founder's query.
You MUST cite your sources by referencing the document name and section title in square brackets, e.g. [AeroFlow_Pitch_Deck.md - Market Size].
If the retrieved context does not contain sufficient details, state that the context is missing rather than guessing.

### INGESTED CORPORATE KNOWLEDGE BASE CONTEXT:

---
SOURCE: [AeroFlow_Pitch_Deck.md - Slides 4]
CONTENT: "Predictive scaling algorithm saves cloud expenses by up to 34% annually. Target Seed funding round of $1.5M at a $10M pre-money valuation cap to expand engineering talent."
---

SOURCE: [Q3_Financial_Projections.xlsx - Sheet 1]
CONTENT: "Current cash balance is $245,000. Running monthly burn rate is $18,500, resulting in 13.2 months of runway."
---
```
---

## 5. Integration APIs

The RAG backend exposes the following clean interfaces:

- **`POST /api/knowledge`**: Uploads, chunks, embeds, and indexes a raw text or Markdown file.
- **`POST /api/knowledge/query`**: Executes a semantic search and returns a fully cited markdown answer.
