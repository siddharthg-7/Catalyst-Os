# FounderOS Architecture: System Overview & Core Foundations

This document details the macro-architecture of **FounderOS**, a production-ready AI Operating System designed for startup founders.

---

## 1. Directory Structure

Below is the production-ready directory structure designed for modular debugging, clean separation of concerns, and clear boundaries between frontend execution, backend routing, multi-agent reasoning, and document ingestion (RAG).

```text
founder-os/
├── .env.example                # Template for environment variables (including GEMINI_API_KEY)
├── package.json                # Project dependencies and deployment build tasks
├── tsconfig.json               # TypeScript compiler options
├── vite.config.ts              # Frontend bundler and HMR server configuration
├── server.ts                   # Backend bootstrapper and Express gateway
├── backend/                    # Core Full-Stack Backend Layer
│   ├── state.ts                # In-memory startup database and state engine
│   ├── routes/                 # Express API routing layer
│   │   ├── startup.ts          # Startup profile & metrics handlers
│   │   ├── agents.ts           # Agent telemetry and metadata endpoints
│   │   ├── initiatives.ts      # Strategic sprints & multi-agent triggers
│   │   ├── approvals.ts        # Human-in-the-loop validation handlers
│   │   ├── knowledge.ts        # Knowledge file upload & search queries
│   │   └── decisions.ts        # Immutable decision log queries
│   └── services/               # Modular reasoning & orchestration services
│       ├── gemini.ts           # Google GenAI model integrations
│       ├── rag.ts              # Text chunking, parsing, and semantic search
│       └── simulation.ts       # Multi-agent collaboration simulation
└── src/                        # Frontend Presentation Layer (React + Tailwind)
    ├── main.tsx                # Frontend entry point
    ├── App.tsx                 # Core single-screen application shell
    ├── types.ts                # Shared TypeScript models and interfaces
    ├── index.css               # Tailwind v4 utility style sheet
    └── components/             # Reusable interactive components
        ├── MetricCards.tsx     # Startup KPI and Health Score cards
        ├── AgentWorkspace.tsx  # Executive Agent status & roster
        ├── WorkflowCanvas.tsx  # Multi-Agent visual graph and debate simulation
        ├── ApprovalQueue.tsx   # Human Founder approval and document review
        ├── KnowledgeBase.tsx   # Document uploader and query panel
        └── DecisionLog.tsx     # Ledger of executed and rejected strategic decisions
```

---

## 2. Frontend Architecture (React + Tailwind)

FounderOS is structured as an interactive, highly responsive Single Page Application (SPA) designed to act as an "executive command center" for startup founders.

- **Reactive State Management**: Simple, predictable React state engines hydrate dynamically from `/api` endpoints on mount.
- **Component Separation**: All visual widgets are extracted into isolated components under `/src/components/`, ensuring that files remain under token limits and are highly maintainable.
- **Visual Design Philosophy**: Generous negative space, dark neutral slate backgrounds, precise typography pairing ("Inter" for utility copy and monospace fonts for tactical data), and fluid animations (via the `motion` library) are used to eliminate visual clutter.

---

## 3. Backend Architecture (Express + Node + TypeScript)

The backend is built as a fast, type-safe REST API server using Express and TypeScript.

- **Vite Integration**: During development, Express mounts Vite as a middleware (`middlewareMode: true`) to deliver an instant, seamless single-process dev experience. In production, it hosts the static compiled assets from `dist/`.
- **Stateless Routing**: Routing is fully modularized in `/backend/routes/`.
- **Graceful Failbacks**: For developer ergonomics, all AI integrations fall back to high-fidelity, offline heuristics if `GEMINI_API_KEY` is not present in the environment.

---

## 4. Database Schema

For a production-ready system, a relational schema (e.g., PostgreSQL using Prisma/Drizzle) is recommended to persist startups, metrics, agents, and logs.

```sql
-- Core Startup Entity
CREATE TABLE startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    funding_stage VARCHAR(50) NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL,
    burn_rate DECIMAL(15, 2) NOT NULL,
    health_score INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real-time Operational Metrics
CREATE TABLE startup_metrics (
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    velocity INT NOT NULL,
    financial_health INT NOT NULL,
    legal_compliance INT NOT NULL,
    growth_rate INT NOT NULL,
    operations_efficiency INT NOT NULL,
    PRIMARY KEY (startup_id)
);

-- Strategic Initiatives (Sprints)
CREATE TABLE initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'funding' | 'hiring' | 'growth' | 'legal' | 'operations'
    status VARCHAR(50) NOT NULL, -- 'pending' | 'active' | 'completed' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic Conversation Logs
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    sender VARCHAR(100) NOT NULL,
    receiver VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_conflict BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vetted Strategic Deliverables (Awaiting Founder Approval)
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'document' | 'contract' | 'financials' | 'marketing_plan'
    content TEXT NOT NULL, -- Comprehensive markdown body
    impact TEXT NOT NULL,
    financial_change DECIMAL(15, 2) NOT NULL,
    metric_changes JSONB NOT NULL, -- {velocity: +10, financialHealth: -3...}
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- 'pending_review' | 'approved' | 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Immutable Decision Ledger
CREATE TABLE decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    impact_text TEXT NOT NULL,
    financial_impact DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'approved' | 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. API Structure

A set of RESTful JSON endpoints coordinate all operations:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/startup` | Retrieves the primary startup profile, runway, cash, and health metrics. |
| **POST** | `/api/startup` | Updates company variables and recalculates financial runway months. |
| **GET** | `/api/agents` | Retrieves status and real-time activity descriptors for all simulated executives. |
| **GET** | `/api/initiatives` | Lists all active and historically completed multi-agent strategic sprints. |
| **POST** | `/api/initiatives` | Registers a new strategic objective to spawn an executive simulation. |
| **POST** | `/api/initiatives/:id/simulate` | Triggers the multi-agent Gemini orchestration cycle for a specific initiative. |
| **GET** | `/api/approvals` | Retrieves deliverables queued up for human founder review. |
| **POST** | `/api/approvals/:id/review` | Registers an 'approve' or 'reject' action, applying metric transformations. |
| **GET** | `/api/decisions` | Queries the immutable ledger of historically committed decisions. |
| **GET** | `/api/knowledge` | Lists uploaded contextual company documents. |
| **POST** | `/api/knowledge` | Uploads a new corporate document, parsing and generating automated summaries. |
| **POST** | `/api/knowledge/query` | Executes a semantic search query against the uploaded knowledge vault. |

---

## 6. Recommended Tech Stack

For a high-traffic production build, the following technology suite is selected:

- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Lucide Icons + Motion (Framer Motion)
- **Charts / Visualizations**: Recharts + D3.js (for custom force-directed network topology nodes)
- **Backend Runtime**: Node.js + Express (or Fastify for hyper-speed REST APIs)
- **Database Engine**: Cloud SQL (PostgreSQL) for structured states
- **Vector Search (RAG)**: pgvector extension on Cloud SQL or Cloud Firestore (Native Vector Search)
- **LLM Orchestration**: `@google/genai` TypeScript SDK using `gemini-3.5-flash` for high-speed, cost-effective reasoning, and `gemini-3.5-pro` for complex strategic resolutions.

---

## 7. Deployment & Security Design

### Deployment Architecture
- **Server Environment**: Google Cloud Run (Containerized Docker microservices, automatically scaling to zero during idle hours).
- **Static Hosting**: Google Cloud Storage + Cloud CDN for edge asset distribution.
- **CI/CD Pipeline**: GitHub Actions testing typescript compliance, lint checks, and automatically rebuilding and pushing Docker containers to Artifact Registry upon main merges.

### Security & Compliance
- **API Key Safeguards**: All Gemini keys and database secrets are bound via environment variables utilizing Google Cloud Secret Manager. They are *never* sent or exposed to the client browser.
- **Data Protection**: Transit-layer encryption via HTTPS (TLS 1.3). Database encryption at rest.
- **User Authentication**: Firebase Authentication for developer access control, defining tenant-isolated schemas to prevent inter-startup data leaks.
- **Human-in-the-Loop Safeguards**: High-risk financial movements (e.g. burn changes > 10% or budget approvals) require an explicit signature from the founder via the `ApprovalQueue` before mutating core startup parameters.
