# CatalystOS — P1 Task 4: Company Context Layer

## Overview

The **Company Context Layer** is the centralized, standardized, and authoritative single source of truth for company and founder context in CatalystOS. It unifies all structured data stored across PostgreSQL tables, memories, and onboarding flows, exposing an AI-provider agnostic context model to:
- Executive SaaS Dashboard
- AI Chief of Staff (Atlas / CEO)
- Multi-Agent Orchestrator
- Specialist Executive Agents (Aura CFO, Vector CMO, Echo HR, Nexus GC, Helix COO, Apex IR, Sentry Auditor)
- Autonomous Workflows and Strategic Decision Engines

---

## 1. Existing Company Data Sources

CatalystOS persists founder and company intelligence across several specialized PostgreSQL entities:

| Data Entity | Table in DB | Description |
|---|---|---|
| **User** | `User` | Founder identity, credentials, name, email, role |
| **Startup** | `Startup` | Company name, description, industry, funding stage, cash balance, burn rate, health score, owner ID |
| **Memories** | `Memory` | Context items: `BUSINESS_ICP`, `PRIMARY_PRODUCT`, `PROBLEM_STATEMENT`, `KEY_CHALLENGE`, `TIMELINE`, `TEAM_SIZE`, `ADDITIONAL_INFO`, `BUSINESS_MODEL`, `GOAL`, `PRIORITY` |
| **Milestones** | `TimelineItem` | Historical and target corporate milestones |
| **Decisions** | `DecisionLog` | Immutable ledger of executive signed-off actions |
| **Executive Agents** | `ExecutiveAgent` | 8 canonical autonomous executives provisioned per startup |
| **Approvals** | `Approval` | Pending deliverables, financial adjustments, and metric gates |
| **Knowledge Base** | `StartupDocument`, `KnowledgeChunk`, `Embedding` | Unstructured corporate files & living company profile indexed in `pgvector` |

---

## 2. Company Context Structure

The canonical context is structured into clean, modular snapshots:

```text
CompanyContext
├── identity
│   ├── name: string
│   ├── description: string
│   ├── industry: string
│   ├── stage: string
│   └── location: string
├── founder
│   ├── id: string
│   ├── name: string
│   ├── role: string
│   └── email: string
├── business
│   ├── model: string
│   ├── targetIcp: string
│   ├── primaryProduct: string
│   ├── problem: string
│   ├── valueProposition: string
│   └── additionalInfo: string
├── financial
│   ├── cashBalance: number
│   ├── monthlyBurn: number
│   ├── runwayMonths: number
│   ├── budget: number
│   ├── healthScore: number
│   └── metrics: { velocity, financialHealth, legalCompliance, growthRate, operationsEfficiency }
├── growth
│   ├── goals: string[]
│   ├── currentPriorities: string[]
│   ├── targetTimeline: string
│   └── milestones: Array<{ id, title, content, type, createdAt }>
├── operations
│   ├── teamSize: string | number
│   ├── biggestChallenge: string
│   ├── executiveAgents: Array<{ id, role, name, status, currentTask }>
│   ├── pendingApprovalsCount: number
│   └── pendingApprovals: Array<{ id, title, description, type, financialChange, status }>
├── goals
│   ├── strategicGoals: string[]
│   ├── currentPriorities: string[]
│   └── targetMilestones: string[]
└── metadata
    ├── startupId: string
    ├── ownerId: string
    ├── cachedAt: number
    └── lastUpdated: string
```

*(Note: For 100% backwards compatibility with legacy consumers, flat accessors such as `context.startup`, `context.financials`, and `context.goals` are preserved as convenience properties).*

---

## 3. Centralized Context Service

Implemented in `backend/services/companyContextService.ts`:

- **`getContextForUser(userId: string)`**: Resolves context strictly where `ownerId === userId`. Guarantees tenant isolation.
- **`getContextForStartup(startupId: string, requestingUserId: string)`**: Verifies that the requested startup belongs to the requesting user before loading, preventing cross-tenant access.
- **`getAgentScopedContext(context: CompanyContext, role: string)`**: Scopes the context to only the relevant operational domains for a specific agent.
- **`toPromptContext(context: CompanyContext, role?: string)`**: Formats the context into an AI-provider agnostic Markdown block for LLM prompts, strictly omitting internal credentials or secrets.
- **`invalidate(startupIdOrUserId: string)`**: Purges cached context to ensure immediate freshness on database updates.

---

## 4. Authentication & Authorization Flow

```text
Authenticated Request (JWT Bearer Token)
         ↓
authenticateJWT Middleware (Validates token, extracts req.user.id)
         ↓
API Route Handler (e.g., GET /api/startup/context)
         ↓
companyContextService.getContextForUser(req.user.id)
         ↓
Prisma Query: prisma.startup.findFirst({ where: { ownerId: req.user.id } })
         ↓
[If another user's startupId was passed via query parameter]
Prisma check: Verify startup.ownerId === req.user.id
→ If mismatch: HTTP 403 Forbidden
         ↓
Assemble Normalized Context (Safe defaults for missing optional fields)
         ↓
Return Sanitized Context (onboarded: true)
```

---

## 5. AI Chief of Staff Integration

When a founder issues a command via the Dashboard Chatbot or Command Palette (`/api/orchestrate` or `/api/orchestrate/stream`):
1. `orchestrationService.executeCommand` resolves the canonical context strictly via `companyContextService.getContextForUser(req.user.id)`.
2. Missing workspaces prompt the user to onboard (`status: 'needs_information'`).
3. Active company context is formatted using `companyContextService.toPromptContext(canonical, 'CEO')`.
4. Injected under `CANONICAL COMPANY CONTEXT (SINGLE SOURCE OF TRUTH)` into the Gemini 2.5 Flash synthesis prompt.
5. The CEO Chief of Staff generates grounded executive answers without hallucinating company metrics.

---

## 6. Multi-Agent & Specialist Agent Integration

### Multi-Agent Orchestration
During initiative simulation (`POST /api/initiatives/:id/simulate`), `runMultiAgentCollaboration(init, companyContext)` receives the authenticated company context instead of static global mocks.

### Specialist Agent Scoping
Each specialist executive receives only the context slice necessary for their domain:
- **Finance (CFO)**: Receives `identity`, `financial`, `businessModel`, `strategicGoals`, and deterministic runway assessment (`cash`, `burn`, `runwayMonths`).
- **Growth (CMO)**: Receives `identity`, `targetIcp`, `primaryProduct`, `problemSolved`, `growthPriorities`, and `targetTimeline`.
- **Talent (HR)**: Receives `identity`, `teamSize`, `biggestChallenge`, `budgetLimitMonthly`, and `runwayMonths`.
- **Legal (GC)**: Receives `identity`, `businessModel`, `primaryProduct`, and `pendingApprovals`.
- **Operations (COO)**: Receives `identity`, `operations`, `milestones`, and `currentPriorities`.
- **CEO (Chief of Staff)**: Receives the complete unified executive context.

### Specialty Endpoints Grounding
In `backend/agents/controller.ts`, endpoints like `/api/finance/burn-chart`, `/api/finance/affordability-check`, and `/api/talent/benchmarks` now query `companyContextService.getContextForUser(req.user.id)` to compute real projections based on the founder's actual treasury and team numbers.

---

## 7. Context & RAG Coexistence

Company Context and Vector Knowledge/RAG are maintained as distinct, complementary layers:
- **Company Context (Structured)**: Deterministic facts (cash, burn, runway, ICP, goals, agents, milestones) stored in PostgreSQL relational tables and memory records.
- **Knowledge/RAG (Unstructured)**: Corporate documents, pitch decks, PDFs, and notes chunked, embedded, and queried via cosine similarity in `pgvector`.
- In the orchestration pipeline, both are combined into the prompt under clearly separated sections:
  - `CANONICAL COMPANY CONTEXT (SINGLE SOURCE OF TRUTH)`
  - `INTERNAL VERIFIED KNOWLEDGE BASE: [CIT-1] ...`

---

## 8. Security & Multi-Tenant Isolation

1. **Cross-Company Access Prevention**: Verified via automated test (User A querying Company B by startup ID receives `null` / `403 Forbidden`).
2. **Credential Sanitization**: `toPromptContext` and API responses never expose password hashes, `JWT_SECRET`, database connection strings, or cloud keys.
3. **Cache Partitioning**: In-memory cache is strictly keyed by `startupId` and `ownerId`. Cross-tenant hits are checked against `metadata.ownerId`.

---

## 9. API Changes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/startup/context` | `authenticateJWT` | Returns normalized `CompanyContext` with `{ onboarded: true }` |
| `GET` | `/api/company/context` | `authenticateJWT` | Alias for `/api/startup/context` supporting standard REST naming |
| `GET` | `/api/finance/burn-chart` | `authenticateJWT` | Dynamic burn chart grounded in authenticated company financials |
| `GET` | `/api/finance/affordability-check` | `authenticateJWT` | Budget affordability calculation based on active runway |
| `GET` | `/api/talent/benchmarks` | `authenticateJWT` | Compensation benchmarks tailored to company industry and stage |
| `POST` | `/api/growth/generate-assets` | `authenticateJWT` | Copy generation personalized with company name, ICP, and problem |

---

## 10. Automated Tests

The test suite in `tests/companyContext.test.ts` covers 47 assertions across 8 test suites:
- **Test 1**: Founder Context Retrieval (Pass)
- **Test 2**: Structured Snapshot Verification (Pass)
- **Test 3**: Context Freshness & Cache Invalidation (Pass)
- **Test 4**: Unauthenticated User Rejection (Pass)
- **Test 5**: Multi-Tenant Cross-Company Isolation (Pass)
- **Test 6**: AI Prompt Context Formatting & Safety (Pass)
- **Test 7**: Specialist Agent Context Scoping (Pass)
- **Test 8**: Missing Optional Fields Resilience (Pass)

Execute tests via:
```bash
npx tsx tests/companyContext.test.ts
```

---

## 11. Future Improvements (Post-P1)

1. **Multi-User Workspace Membership**: Introduce a `Membership` table permitting multiple team members (with distinct roles like CFO, COO, Viewer) to share access to the same startup company context.
2. **Tenant-Scoped FastAPI Microservice**: Align the secondary Python FastAPI service with PostgreSQL tenant IDs rather than single-record queries.
3. **Event-Driven Cache Invalidation**: Use Redis Pub/Sub or PostgreSQL `LISTEN/NOTIFY` for cluster-wide cache invalidation across distributed Node.js worker nodes.
