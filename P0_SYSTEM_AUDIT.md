# CatalystOS P0 System Audit

## Overall Status

PARTIAL

---

## 1. Authentication

Status: PARTIAL

Evidence:
- Native Neon PostgreSQL authentication with bcrypt password hashing (10 salt rounds) and JSON Web Tokens (HS256 with 7-day expiration) is fully implemented in `backend/routes/api.ts` (lines 89–295) across `/api/auth/signup`, `/api/auth/signin`, `/api/auth/me`, and `/api/auth/logout`.
- Client-side token storage in `localStorage('catalystos_token')` with header injection (`Authorization: Bearer <token>`) via `apiFetch` in `src/context/AuthContext.tsx` (lines 142–159).
- Client-side session verification via `GET /api/auth/me` on mount (`AuthContext.tsx` lines 105–136).
- 1-click Demo Founder login supported via `localStorage('catalystos_demo_user')` (`AuthContext.tsx` lines 86–103).
- **Critical Vulnerability / Fail-Open Gap**: In `backend/services/neonAuthMiddleware.ts` (lines 50–60 and lines 94–102), the `authenticateJWT` middleware falls back to a hardcoded demo user (`usr_founder_demo`, role `'Founder'`) whenever the `Authorization` header is missing, malformed, or invalid. As a result, the backend **never returns HTTP 401 Unauthorized** for unauthenticated requests, allowing anyone to query protected endpoints as `usr_founder_demo`.

Files:
- `backend/services/neonAuthMiddleware.ts` (lines 43–103: `authenticateJWT`)
- `backend/services/neonAuthService.ts` (lines 1–110: JWKS verification & token validation)
- `backend/routes/api.ts` (lines 89–340: auth routes `/signup`, `/signin`, `/me`, `/logout`)
- `src/context/AuthContext.tsx` (lines 1–251: state, `signin`, `signup`, `logout`, `apiFetch`)
- `src/components/AuthScreen.tsx` (lines 91–120: auth forms & submission handlers)

Flow:
```text
Landing (/)
→ Sign In / Sign Up (/auth)
→ POST /api/auth/signin or /api/auth/signup
→ Neon PostgreSQL (User model check / bcrypt.hash / prisma.user.create)
→ JWT Token Generation (jwt.sign { sub: user.id, email, name, role })
→ Client AuthContext (localStorage.setItem('catalystos_token', token))
→ Authenticated API Requests (apiFetch attaches 'Authorization: Bearer <token>')
→ Backend Middleware (authenticateJWT verifies token via JWT_SECRET)
→ req.user populated with { id, email, name, role }
→ User Startup / Company Context loaded via workspaceService.getCanonicalContext(req.user.id)
→ Dashboard (/dashboard)
```

Missing:
1. Strict `401 Unauthorized` enforcement in `backend/services/neonAuthMiddleware.ts`: Missing or invalid tokens currently fall back to `usr_founder_demo` instead of returning `res.status(401).json({ error: 'Unauthorized' })`.
2. Token invalidation / blacklist on `/api/auth/logout`: The backend endpoint merely returns `{ success: true }` without invalidating the JWT or managing token revocation.

---

## 2. User → Startup Relationship

Status: PARTIAL

Evidence:
- Database schema (`prisma/schema.prisma` lines 12–45) defines a 1-to-many relationship from `User` to `Startup`:
  ```prisma
  model User {
    id        String    @id @default(uuid())
    ...
    startups  Startup[]
  }

  model Startup {
    id        String    @id @default(uuid())
    ownerId   String
    owner     User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
    ...
  }
  ```
- Startup ownership is resolved in `backend/services/workspaceService.ts` (`getCanonicalContext`, lines 603–624):
  ```typescript
  let startup = await prisma.startup.findFirst({
    where: {
      OR: [
        { id: startupIdOrUserId },
        { ownerId: startupIdOrUserId }
      ]
    }
  });
  ```
- Backend APIs derive the current startup by querying `prisma.startup.findFirst({ where: { ownerId: req.user.id } })` (e.g., `backend/routes/api.ts` lines 428, 447, 1025).

Files:
- `prisma/schema.prisma` (lines 12–45: `User` and `Startup` models)
- `backend/services/workspaceService.ts` (lines 350–405: startup creation & context retrieval)
- `backend/routes/api.ts` (lines 367–550: `/startup`, `/startup/onboarding`, `/startup/context`)
- `backend/py_service/app/models/schemas.py` (lines 10–23: FastAPI `StartupContext` model)
- `backend/py_service/app/main.py` (lines 91–125: FastAPI `/api/startup` endpoints)

Flow:
```text
Authenticated User (req.user.id)
→ workspaceService.getCanonicalContext(req.user.id)
→ Prisma Query: prisma.startup.findFirst({ where: { ownerId: req.user.id } })
→ Canonical Startup Context hydrated (financials, agents, documents, memories, goals)
→ Attached to operational endpoints (AI orchestration, dashboard state, RAG)
```

Missing:
1. Multi-user startup membership: There is no `Membership` or `StartupMember` table. Startups are strictly single-owner (`ownerId: String`). Multiple team members cannot currently share access to the same startup company.
2. Cross-service tenancy disconnect: The Python FastAPI microservice (`backend/py_service`) uses a separate table `startup_contexts` that lacks an `ownerId` column, and its endpoints query `db.query(StartupContext).first()`, making the Python service effectively single-tenant.

---

## 3. Onboarding

Status: PASS

Evidence:
- Onboarding supports both "Existing Startup" and "New Idea" pathways in `src/components/AuthScreen.tsx` (lines 122–204).
- Captured fields include: Startup Name, Description, Problem Statement, Target ICP / Customers, Industry, Stage / Funding Stage, Team Size, Biggest Operational Challenge, Target Milestone / Timeline, Additional Notes, Cash Balance, Monthly Burn, and Budget.
- Client submits payload to `POST /api/startup/onboarding` (`src/App.tsx` lines 108–134).
- Backend handler `workspaceService.saveOnboardingData` (`backend/services/workspaceService.ts` lines 347–591):
  1. Upserts `Startup` record with financial metrics and health scores.
  2. Synchronizes with legacy/FastAPI `startup_contexts` table.
  3. Provisions 8 canonical Executive Agents (`ExecutiveAgent` table: CEO Atlas, Finance Aura, Talent Echo, Growth Vector, Legal Nexus, Operations Helix, Investment Apex, Auditor Sentry).
  4. Stores ICP, product, business model, challenges, and goals into `Memory` records.
  5. Generates an executive company profile via Gemini AI (`analyzeStartupProfile`).
  6. Automatically chunks, embeds, and indexes a living knowledge document `[Company Profile] <StartupName>` into `pgvector` knowledge storage (`StartupDocument`, `KnowledgeChunk`, `Embedding`).
  7. Creates initial `TimelineItem` milestone.
- Onboarding data is immediately available to the AI via `workspaceService.getCanonicalContext()` and vector RAG retrieval.
- Onboarding status is persisted in `localStorage('catalystos_onboarding_completed_<userId>')` and verified against the backend via `GET /api/startup` returning `{ onboarded: true }`.

Files:
- `src/components/AuthScreen.tsx` (lines 122–232: 9-step wizard and payload generator)
- `src/App.tsx` (lines 41–134: onboarding state management, verification, and submission)
- `backend/routes/api.ts` (lines 367–400: `POST /api/startup/onboarding`)
- `backend/services/workspaceService.ts` (lines 347–591: `saveOnboardingData`, profile analysis, agent initialization, knowledge indexing)

Flow:
```text
New Founder
→ /onboarding (AuthScreen wizard: 9 steps)
→ POST /api/startup/onboarding
→ workspaceService.saveOnboardingData(userId, payload)
→ Neon PostgreSQL (Startup, Memory, ExecutiveAgent, TimelineItem, StartupDocument)
→ Document Chunking & Embedding (ingestDocument into pgvector)
→ In-Memory Cache Invalidation (workspaceCache.delete)
→ Return Canonical Context
→ Frontend sets onboardingCompleted = true
→ Redirect to /dashboard
→ AI Orchestrator loads canonical context on subsequent commands
```

Missing:
- None. The onboarding flow, data persistence, and downstream ingestion into AI context work as designed.

---

## 4. Dashboard Protection

Status: PARTIAL

Evidence:
- **Frontend Protection**: **PASS**.
  - `src/App.tsx` (lines 873–891) wraps `/dashboard/*` in an authentication guard. If `loading` is false and `!user`, the client immediately renders `<Navigate to="/auth" replace />`.
  - Direct URL access to `/approvals`, `/knowledge`, `/workflows`, `/agents` redirects to `/dashboard/*` routes which inherit this protection (`App.tsx` lines 866–870).
- **Backend API Protection**: **PARTIAL / FAIL**.
  - Dashboard operational endpoints (`/api/startup`, `/api/approvals`, `/api/knowledge`, `/api/initiatives`, `/api/notifications`, `/api/orchestrate`) specify `authenticateJWT` in `backend/routes/api.ts`.
  - However, because `authenticateJWT` falls back to `usr_founder_demo` when no `Authorization` header is present (`backend/services/neonAuthMiddleware.ts` lines 50–60), direct HTTP/cURL requests without credentials succeed and return `usr_founder_demo`'s dashboard data rather than returning `401 Unauthorized`.
- **Onboarding Gate on Dashboard**:
  - In `src/App.tsx` (lines 873–891), authenticated users who have NOT completed onboarding are NOT automatically redirected to `/onboarding`. Instead, `App.tsx` renders `renderDashboard()`, which displays an infinite spinner ("Initializing CatalystOS Executive Council...") if `startup` is null, or default fallback data if loaded.

Files:
- `src/App.tsx` (lines 850–891: React Router route definitions and guards)
- `backend/routes/api.ts` (lines 444–1370: protected API route definitions)
- `backend/services/neonAuthMiddleware.ts` (lines 43–103: `authenticateJWT`)

Flow:
```text
Unauthenticated User
→ Visits /dashboard
→ Frontend Guard (App.tsx: !user)
→ Redirected to /auth (PASS)
→ Direct API Call (curl /api/startup)
→ Backend Middleware (authenticateJWT)
→ Injects usr_founder_demo fallback (FAIL: Should return 401)

Authenticated + Incomplete Onboarding
→ Visits /dashboard
→ Frontend renders dashboard with empty/loading startup state instead of redirecting to /onboarding (PARTIAL)

Authenticated + Onboarded Founder
→ Visits /dashboard
→ State hydrated from GET /api/startup
→ SaaSDashboard renders with real operational data (PASS)
```

Missing:
1. Backend `401 Unauthorized` responses for unauthenticated API calls to dashboard endpoints.
2. Frontend automated route redirect: If `user` is authenticated but `!onboardingCompleted`, automatically navigate to `/onboarding`.

---

## 5. Roles & Authorization

Status: PARTIAL

Evidence:
- User roles are stored as a string on the `User` model (`prisma/schema.prisma` line 16: `role String @default("founder")`). Supported roles in code include `'Founder'`, `'Executive'`, `'Investor'`, and `'Admin'`.
- Role verification middleware `requireRole(allowedRoles)` exists in `backend/services/neonAuthMiddleware.ts` (lines 109–130).
- Protected endpoints using `requireRole`:
  - `POST /api/startup` requires `['Founder', 'Admin']` (`api.ts` line 526)
  - `POST /api/approvals/:id/review` requires `['Founder', 'Admin']` (`api.ts` line 875)
- Frontend role check: `src/App.tsx` (line 432) checks `if (user?.role === 'Executive')` and prevents approvals review with an alert toast.
- **Critical Authorization Gap**: In `backend/services/neonAuthMiddleware.ts` (lines 124–128):
  ```typescript
  if (!allowedRoles.includes(req.user.role)) {
    req.user.role = 'Founder';
  }
  next();
  ```
  Instead of rejecting unauthorized roles with HTTP `403 Forbidden`, `requireRole` **promotes the user's role to `'Founder'`** and permits the request to proceed!
- Specialty agent endpoints in `backend/agents/controller.ts` (`/api/finance/*`, `/api/talent/*`, `/api/growth/*`) have **no authentication or role middleware** applied.

Files:
- `backend/services/neonAuthMiddleware.ts` (lines 109–130: `requireRole`)
- `backend/routes/api.ts` (lines 526, 875: role-guarded endpoints)
- `backend/agents/controller.ts` (lines 1–141: unauthenticated specialty endpoints)
- `src/App.tsx` (lines 431–436: client-side role check for approvals)

Flow:
```text
Role (e.g., 'Executive')
↓
API Call (POST /api/approvals/:id/review)
↓
Middleware (requireRole(['Founder', 'Admin']))
↓
Evaluation (!allowedRoles.includes(role))
↓
Actual Behavior: req.user.role = 'Founder'; next(); (VULNERABILITY: Promotes user)
Expected Behavior: return res.status(403).json({ error: 'Forbidden' })
```

Missing:
1. Strict `403 Forbidden` response in `requireRole`: Middleware must reject unauthorized roles instead of overriding `req.user.role`.
2. Auth & role middleware on `backend/agents/controller.ts`: Endpoints like `/api/finance/burn-chart` and `/api/talent/score-candidates` currently have no middleware.
3. Database RBAC: There is no granular permissions table or role assignment entity; role is an unconstrained string on the `User` record.

---

## 6. AI Company Context

Status: PASS

Evidence:
- Company context is stored in PostgreSQL across `Startup`, `Memory`, `StartupDocument`, `KnowledgeChunk`, and `Embedding` tables.
- Context is loaded dynamically in `backend/services/workspaceService.ts` via `workspaceService.getCanonicalContext(userIdOrStartupId)`.
- Context is injected into AI execution in `backend/services/orchestrationService.ts` (`executeCommand`, lines 376–427 and 740–783):
  - Injected parameters: Company Name, Industry, Stage, Core Positioning/Description, Target ICP, Primary Product Offering, Strategic Goals, Current Priorities, Health Score, Cash Balance, Monthly Burn, and Runway Months.
  - Hybrid RAG chunks retrieved from `performHybridSearch()` across the company's uploaded documents are injected as `INTERNAL VERIFIED KNOWLEDGE BASE: [CIT-1] ...`.
  - Deterministic calculations (cash depletion, runway projections, salary affordability) are computed and injected under `DETERMINISTIC APPLICATION CALCULATIONS`.
- Prompts are submitted to Google Gemini (`gemini-2.5-flash`) via `@google/genai` SDK (`ai.models.generateContent`).
- Context reaches all 8 specialist agents (Atlas CEO, Aura Finance, Echo Talent, Vector Growth, Nexus Legal, Helix Ops, Apex Investment, Sentry Auditor).
- If an uninitialized user submits a command, the orchestrator detects missing canonical context and returns `status: 'needs_information'` directing the user to onboard (`orchestrationService.ts` lines 392–412).

Files:
- `backend/services/workspaceService.ts` (lines 596–738: `getCanonicalContext` and canonical object assembly)
- `backend/services/orchestrationService.ts` (lines 376–427: context resolution; lines 740–783: prompt template and context injection)
- `backend/services/ragEngine.ts` (lines 140–280: `performHybridSearch`, vector cosine similarity, chunk retrieval)
- `backend/services/geminiService.ts` (lines 1–85: Google GenAI initialization)

Flow:
```text
Founder enters company information (Onboarding / Settings)
        ↓
Neon PostgreSQL (Startup, Memory, StartupDocument, Embedding)
        ↓
workspaceService.getCanonicalContext(userId)
        ↓
orchestrationService.executeCommand()
        ↓
Dynamic Prompt Construction (Company identity + Financials + ICP + RAG Chunks)
        ↓
Google Gemini 2.5 Flash API
        ↓
Chief of Staff (Atlas CEO) Verdict + Specialist Contributions (Finance, Talent, Growth, Legal, Ops, Auditor)
```

Missing:
- None. Context extraction, RAG injection, and agent dispatch are fully operational and grounded in the authenticated founder's company profile.

---

## 7. Routes

Table:

| Route | Auth | Role | Onboarding | Status |
|---|---|---|---|---|
| `/` | Public | None | Not Required | Working |
| `/auth` | Public (redirects to `/dashboard` if logged in) | None | Not Required | Working |
| `/onboarding` | Protected (`!user` redirects to `/auth`) | Any | In Progress | Working |
| `/dashboard` | Protected (`!user` redirects to `/auth`) | Any | Expected (shows spinner if null) | Working (Frontend); Fail-open (Backend API) |
| `/dashboard/approvals` | Protected (`!user` redirects to `/auth`) | Founder/Admin for review actions | Required | Working (Review requires Founder role) |
| `/dashboard/knowledge` | Protected (`!user` redirects to `/auth`) | Any | Required | Working |
| `/dashboard/workflows` | Protected (`!user` redirects to `/auth`) | Any | Required | Working |
| `/dashboard/agents/:agentId` | Protected (`!user` redirects to `/auth`) | Any | Required | Working (Tabs for CEO, Finance, Talent, Growth, Legal, etc.) |
| `/approvals` | Protected | Any | Required | Working (Redirects to `/dashboard/approvals`) |
| `/knowledge` | Protected | Any | Required | Working (Redirects to `/dashboard/knowledge`) |
| `/workflows` | Protected | Any | Required | Working (Redirects to `/dashboard/workflows`) |
| `/agents` | Protected | Any | Required | Working (Redirects to `/dashboard/agents`) |
| `/agents/:agentId` | Protected | Any | Required | Working (Redirects to `/dashboard/agents`) |
| `POST /api/auth/signup` | Public | None | None | Working |
| `POST /api/auth/signin` | Public | None | None | Working |
| `GET /api/auth/me` | Protected (`authenticateJWT`) | Any | None | Working (Returns current user session) |
| `POST /api/auth/logout` | Public / Token | None | None | Working |
| `GET /api/startup` | Protected (`authenticateJWT`) | Any | None | Working |
| `POST /api/startup/onboarding` | Protected (`authenticateJWT`) | Any | None | Working |
| `POST /api/startup` | Protected (`authenticateJWT`) | Founder, Admin | Required | Partial (`requireRole` fails open) |
| `GET /api/approvals` | Protected (`authenticateJWT`) | Any | Required | Working |
| `POST /api/approvals/:id/review` | Protected (`authenticateJWT`) | Founder, Admin | Required | Partial (`requireRole` fails open) |
| `GET /api/knowledge` | Protected (`authenticateJWT`) | Any | Required | Working (Scoped to user startup in DB mode) |
| `POST /api/knowledge` | Protected (`authenticateJWT`) | Any | Required | Working (Ingests and vectors file) |
| `POST /api/orchestrate` | Protected (`authenticateJWT`) | Any | Required | Working (Injects canonical context) |
| `POST /api/orchestrate/stream` | Protected (`authenticateJWT`) | Any | Required | Working (SSE stream) |
| `GET /api/notifications` | Protected (`authenticateJWT`) | Any | None | Working |
| `GET /api/finance/*` | Public / Unprotected | None | None | Gap (No auth middleware attached) |
| `POST /api/talent/*` | Public / Unprotected | None | None | Gap (No auth middleware attached) |
| `GET /api/growth/*` | Public / Unprotected | None | None | Gap (No auth middleware attached) |

---

## 8. Database

Existing relevant models/tables (verified in `prisma/schema.prisma` and PostgreSQL migrations):

1. **Users & Identity**:
   - `User`: `id` (UUID), `email` (unique), `name`, `role` (default "founder"), `passwordHash`, `createdAt`, `updatedAt`.
2. **Startups & Companies**:
   - `Startup`: `id` (UUID), `name`, `industry`, `description`, `fundingStage`, `cashBalance`, `burnRate`, `healthScore`, `ownerId` (FK -> User.id), `createdAt`, `updatedAt`.
   - `startup_contexts` (FastAPI legacy sync table): `id`, `company_name`, `industry`, `target_icp`, `current_monthly_burn`, `cash_on_hand`.
3. **Roles & Permissions**:
   - Stored directly as `User.role` (String column). No dedicated `Role` or `Permission` tables exist.
4. **Agents**:
   - `ExecutiveAgent`: `id`, `role`, `name`, `avatar`, `status`, `currentTask`, `startupId` (FK -> Startup.id), `createdAt`, `updatedAt`.
5. **Commands, Plans & Tasks**:
   - `Command`: `id`, `content`, `status`, `startupId` (FK -> Startup.id).
   - `Plan`: `id`, `title`, `description`, `status`, `startupId` (FK -> Startup.id).
   - `Task`: `id`, `title`, `assignedTo`, `status`, `result`, `planId` (FK -> Plan.id).
6. **Approvals**:
   - `Approval`: `id`, `title`, `description`, `type`, `status`, `content`, `impact`, `financialChange`, `metricChanges` (JSON), `planId` (FK -> Plan.id).
   - `approval_gates` (FastAPI legacy sync table): `id`, `action_type`, `payload`, `status`.
7. **Knowledge & Vector Embeddings**:
   - `StartupDocument`: `id`, `name`, `type`, `size`, `summary`, `insights` (String[]), `startupId` (FK -> Startup.id).
   - `KnowledgeChunk`: `id`, `content`, `documentId` (FK -> StartupDocument.id).
   - `Embedding`: `id`, `vector` (Float[] / pgvector), `chunkId` (FK -> KnowledgeChunk.id, unique).
8. **Decisions & Auditing**:
   - `DecisionLog`: `id`, `title`, `description`, `category`, `impactText`, `financialImpact`, `status`, `startupId` (FK -> Startup.id).
   - `TimelineItem`: `id`, `title`, `content`, `type`, `startupId` (FK -> Startup.id).
   - `Execution`: `id`, `action`, `payload` (JSON), `status`, `planId` (FK -> Plan.id).
   - `Notification`: `id`, `title`, `message`, `type`, `read`, `startupId` (FK -> Startup.id).
   - `HealthScore`: `id`, `score`, `metrics` (JSON), `startupId` (FK -> Startup.id).
   - `Memory`: `id`, `category`, `title`, `description`, `startupId` (FK -> Startup.id).

---

## 9. Security

Status: PARTIAL

Verified protections:
- **Password Protection**: Passwords hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are never stored.
- **Database Query Isolation**:
  - `GET /api/knowledge` filters by `where: { startupId: activeStartup.id }` with `activeStartup` resolved from `ownerId: req.user.id`.
  - `GET /api/startup` queries `workspaceService.getCanonicalContext(req.user.id)` which queries `where: { ownerId: userId }`.
  - `GET /api/notifications` filters by `where: { startupId: userStartup.id }`.
  - `POST /api/startup/onboarding` scopes created startup, memories, agents, and documents to the authenticated `req.user.id`.
- **Frontend Role Gating**: Executive accounts cannot submit approval decisions in the UI (`App.tsx` lines 432–435).

Potential gaps:
- **`authenticateJWT` Fails Open**: Requests with missing or invalid tokens are automatically assigned `usr_founder_demo` (`role: 'Founder'`) rather than being rejected with `401 Unauthorized`. Anyone can execute protected endpoints by simply omitting the `Authorization` header.
- **`requireRole` Fails Open**: When a user's role does not match the required list, `requireRole` sets `req.user.role = 'Founder'` and calls `next()` instead of returning `403 Forbidden`.
- **Unprotected Agent Controller Routes**: Endpoints in `backend/agents/controller.ts` (`/api/finance/*`, `/api/talent/*`, `/api/growth/*`) have no authentication middleware and operate directly on in-memory global state.
- **In-Memory Fallback Multi-Tenancy Leak**: In `backend/state.ts`, variables `approvals`, `initiatives`, `decisionLog`, and `knowledgeFiles` are module-level singletons. When database queries fall back to in-memory state (e.g. `!isDbAvailable` or `/api/approvals/:id/review`), all users and tenants share the exact same arrays.
- **Single-Tenant FastAPI Microservice**: The Python service queries `StartupContext.first()` without any user or tenant parameters.
- **Single-Owner Limitation**: The schema only permits 1 user per startup (`ownerId`). There is no collaborative team access.

---

## 10. Recommended Next Step

Only list the SMALLEST next implementation task:

**Tighten `authenticateJWT` and `requireRole` in `backend/services/neonAuthMiddleware.ts` to strictly fail closed:**
1. In `authenticateJWT`: Return `res.status(401).json({ error: 'Unauthorized: Valid Bearer token required' })` when the `Authorization` header is missing, malformed, or invalid (instead of defaulting to `usr_founder_demo`).
2. In `requireRole`: Return `res.status(403).json({ error: 'Forbidden: Insufficient privileges' })` when `!allowedRoles.includes(req.user.role)` (instead of mutating `req.user.role = 'Founder'`).

*(This is a surgical ~15-line update in a single file with zero schema or UI changes).*
