# TASK 03 — FRONTEND ARCHITECTURE BOUNDARY ANALYSIS

## PURPOSE

We have completed the safe structural cleanup.

The next goal is to clean the ACTIVE frontend architecture.

However, this task is still primarily ANALYSIS.

DO NOT perform a large refactor.

DO NOT change application behavior.

DO NOT move files yet.

DO NOT delete files.

DO NOT create a new state-management library.

DO NOT introduce React Router.

DO NOT change backend APIs.

DO NOT modify database code.

---

# CURRENT PROBLEM

The previous audit identified:

* `src/App.tsx` is approximately 771 lines
* `App.tsx` performs many direct API calls
* several components directly call APIs
* `src/services/api.ts` contains only a small subset of API operations
* significant business/state logic exists inside UI components

We now need to design a clean frontend boundary BEFORE making changes.

---

# 1. TRACE EVERY FRONTEND API CALL

Inspect every `.tsx` and `.ts` file under `src/`.

Find:

* `fetch(...)`
* `apiFetch(...)`
* `sendChatMessage(...)`
* `streamChatMessage(...)`
* `fetchTTSAudio(...)`
* any other HTTP/network call

Create a table:

| File | Function/Location | HTTP Method | Endpoint | Purpose | Should Belong In |

The final column should identify the appropriate future service domain.

Possible domains:

* auth
* startup
* agents
* initiatives
* approvals
* decisions
* notifications
* knowledge
* chat
* audio
* vault
* simulation
* orchestration

Do NOT create these services yet.

---

# 2. ANALYZE APP.TSX

Inspect `src/App.tsx` completely.

Separate its responsibilities into:

### A. UI rendering

### B. Application state

### C. API communication

### D. Business logic

### E. Authentication

### F. Notifications

### G. Navigation

### H. Demo/development logic

For every responsibility identify:

* exact code location
* whether it should remain in App.tsx
* proposed future destination

Do NOT move anything yet.

---

# 3. ANALYZE EACH MAJOR COMPONENT

Inspect:

* SaaSDashboard.tsx
* ApprovalQueue.tsx
* AgentWorkspace.tsx
* WorkflowCanvas.tsx
* KnowledgeBase.tsx
* NotificationPanel.tsx
* AuthScreen.tsx
* chatbot/*
* CommandPalette.tsx

For each identify:

* UI responsibilities
* state responsibilities
* API responsibilities
* business logic
* duplicated logic
* reusable logic

Do NOT modify them.

---

# 4. DETERMINE PAGE VS COMPONENT BOUNDARIES

The current application does not use React Router.

Do NOT introduce React Router.

Instead determine which existing components are actually:

### PAGE / VIEW LEVEL

versus

### REUSABLE COMPONENT

Create a proposed structure such as:

src/
pages/
components/
chatbot/
hooks/
context/
services/
types/

But do NOT implement it.

Use actual current files rather than theoretical examples.

---

# 5. DESIGN THE API SERVICE LAYER

Based on actual calls found in the codebase, propose the future service structure.

Example:

src/services/
apiClient.ts
authService.ts
startupService.ts
agentService.ts
initiativeService.ts
approvalService.ts
decisionService.ts
notificationService.ts
knowledgeService.ts
chatService.ts
audioService.ts

IMPORTANT:

Do not blindly use this exact structure.

If a different grouping makes more architectural sense based on the actual code, explain why.

For every proposed service state:

* functions that should move there
* current source location
* endpoint used
* data returned

---

# 6. IDENTIFY FRONTEND TYPES

Inspect:

src/types.ts

and all other frontend type definitions.

Determine:

* domain types
* API response types
* UI-only types
* duplicated types
* types that should eventually be separated by domain

Do NOT change them yet.

---

# 7. IDENTIFY STATE OWNERSHIP

For every major state variable in:

* App.tsx
* AuthContext
* SaaSDashboard
* ApprovalQueue
* AgentWorkspace
* KnowledgeBase
* chatbot

identify:

STATE
CURRENT OWNER
WHO READS IT
WHO WRITES IT
PROPOSED OWNER

Do not introduce Redux, Zustand, React Query, or another state library.

Use existing React state/context patterns for the proposal.

---

# 8. IDENTIFY BUSINESS LOGIC IN UI

Find calculations and decisions currently performed inside UI components.

Examples:

* financial calculations
* date calculations
* formatting
* startup health calculations
* initiative logic
* approval logic
* data transformations
* API response transformations

Classify each as:

UI LOGIC
DOMAIN LOGIC
API MAPPING
UTILITY

Do not move anything.

---

# 9. IDENTIFY DUPLICATION

Find duplicated:

* API calls
* types
* formatting
* state transformations
* business calculations
* endpoint definitions
* error handling
* loading handling

Do not fix them.

---

# 10. PROPOSE TARGET FRONTEND STRUCTURE

Based ONLY on what actually exists, propose a clean structure.

Example:

src/
├── app/
├── pages/
├── components/
├── chatbot/
├── hooks/
├── context/
├── services/
│   ├── apiClient.ts
│   └── domains/
├── types/
└── utils/

But adapt this to the actual codebase.

For every folder explain its responsibility.

---

# 11. MIGRATION ORDER

Provide the safest sequence for implementing the frontend cleanup.

For example:

1. Create API client
2. Extract auth API
3. Extract startup API
4. Extract approvals API
5. Extract remaining APIs
6. Move API calls out of components
7. Extract hooks
8. Reduce App.tsx
9. Move pages/views
10. Clean types

But do NOT assume this order is correct.

Determine the safest order from the actual dependency graph.

---

# 12. IMPORTANT SAFETY RULE

Do NOT modify the repository.

At the end verify:

FILES MODIFIED: 0
FILES DELETED: 0
FILES MOVED: 0
DEPENDENCIES CHANGED: 0
DATABASE CHANGED: NO
API CONTRACTS CHANGED: NO

---

# 13. REQUIRED OUTPUT

Return:

# TASK 03 — FRONTEND ARCHITECTURE ANALYSIS

## 1. Current Frontend Architecture

## 2. Complete API Call Inventory

## 3. App.tsx Responsibility Map

## 4. Component Responsibility Map

## 5. State Ownership Map

## 6. Business Logic Found in UI

## 7. Type Architecture

## 8. Duplication

## 9. Proposed Service Layer

## 10. Proposed Frontend Directory Structure

## 11. Migration Plan

## 12. Risks

## 13. Files That Should NOT Be Touched

## 14. Final Verification

STOP AFTER REPORTING.

Do NOT implement the proposed architecture.
