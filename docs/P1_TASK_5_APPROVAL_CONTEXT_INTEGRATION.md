# CatalystOS — P1 Task 5: Approval System + Company Context Integration

## Overview

**P1 Task 5** establishes a resilient, closed-loop operational bridge between the **Approval System** and the **Company Context Layer**. When an AI agent or executive proposes a high-impact operational deliverable (e.g. recruiting talent, capital commitments, or treasury allocations), that action remains gated behind explicit founder sign-off. Upon authorized sign-off, the approved operational mutations are safely executed and persisted to PostgreSQL, immediately invalidating the company's context cache so that subsequent AI requests reason from authoritative updated state.

---

## 1. Existing Approval Flow

Prior to Task 5:
- AI agents in `backend/services/orchestrationService.ts` or `geminiService.ts` created deliverables stored in an in-memory queue and inserted into the `Approval` table in PostgreSQL.
- Review requests (`POST /api/approvals/:id/review`) evaluated approvals in memory without verifying company tenant ownership (`ownerId === req.user.id`).
- Approvals did not update the PostgreSQL `Startup`, `DecisionLog`, or `TimelineItem` tables when reviewing deliverables.
- Context invalidation was not connected to approvals; `CompanyContext` remained unchanged even after a founder signed off on a hiring commitment or financial expenditure.
- Repeated review calls did not guard against duplicate execution, risking repeated financial/burn mutations.

Under P1 Task 5:
```text
Founder Command
      ↓
AI / Executive Agent Proposal
      ↓
Structured Approval Created (Status: PENDING_REVIEW)
      ↓
Founder Review (Authorization + Cross-Tenant Check)
      ↓
Founder Sign-Off (Approve / Reject)
      ↓
Idempotency Guard & State Classification
      ↓
Execute Approved Action (PostgreSQL Transaction)
      ↓
Persist Operational State (Startup, DecisionLog, TimelineItem, Memory)
      ↓
Invalidate Company Context Cache (Startup ID + Owner ID)
      ↓
Future AI / Chief of Staff Invocations Reason on Fresh State
```

---

## 2. Approval → Execution Boundary

A strict execution boundary separates action proposal from operational mutation:

```text
PROPOSED → PENDING_REVIEW → EXECUTING → APPROVED (Executed)
                                     ↘ EXECUTION_FAILED
```

### Core Invariants:
1. **Zero Premature Mutations:** An AI agent proposing an action (e.g., "Hire 2 engineers" or "Procure GPU nodes") **NEVER** mutates company state at proposal time.
2. **Founder Authority Boundary:** State mutations are only applied after an authenticated founder with ownership of that company signs off (`action === 'approve'`).
3. **Database Authority:** In-memory states and cached context objects are strictly downstream representations. The PostgreSQL database is the sole authoritative state.

---

## 3. State-Changing vs. Non-State-Changing Actions

Not all approvals alter structured company metrics. Approvals are classified dynamically:

| Action Category | Characteristics | State Mutations Applied |
|---|---|---|
| **Hiring / Headcount** | `type === 'contract'` or title/description contains hiring keywords (`hire`, `recruiting`, `headcount`) | Increments `burnRate` by monthly salary impact; updates `TEAM_SIZE` in `Memory`; recalculates runway `cashBalance / burnRate`. |
| **Financial Commitment / Influx** | `financialChange !== 0` or `type === 'financials'` | Mutates `cashBalance` (+ for funding rounds, - for expenditures); recalculates runway; adjusts recurring burn if recurring. |
| **Operational Metric Adjustments** | Non-empty `metricChanges` JSON | Updates platform `healthScore` and metric indices within [10, 100]. |
| **Non-State-Changing (Deliverable Review)** | `financialChange === 0`, `type === 'document' \| 'marketing_plan'`, no headcount impact | Sets status to `approved`; records in `Execution`, `DecisionLog`, and `TimelineItem`. **Leaves cash, burn rate, team size, and runway untouched.** |

---

## 4. Company Context Integration

Integrated in `backend/services/approvalService.ts`:
- **Before Approval:**
  - `Startup.cashBalance`: $500,000
  - `Startup.burnRate`: $25,000/mo
  - `Startup.runwayMonths`: 20.0 months
  - `Memory.TEAM_SIZE`: "5 engineers"
  - `operations.pendingApprovalsCount`: 1
- **Founder Approves Hiring 2x Engineers ($16,000/mo burn increase):**
  - PostgreSQL `Startup.burnRate` updated: $41,000/mo
  - PostgreSQL `Startup.runwayMonths` recalculated: 12.2 months
  - PostgreSQL `Memory.TEAM_SIZE` updated: "7 engineers"
  - PostgreSQL `Approval.status` set to `'approved'`
  - PostgreSQL `Execution` created with status `'completed'`
  - PostgreSQL `DecisionLog` created with category `'CONTRACT'`, status `'approved'`
  - PostgreSQL `TimelineItem` created with type `'hire'`
- **After Approval & Cache Invalidation:**
  - `companyContextService.getContextForUser(userId)` queries fresh database state.
  - `operations.pendingApprovalsCount`: 0
  - `financial.monthlyBurn`: $41,000/mo
  - `financial.runwayMonths`: 12.2 months
  - `operations.teamSize`: "7 engineers"

---

## 5. Context Invalidation Mechanism

Implemented in `backend/services/companyContextService.ts`:
```typescript
public invalidate(startupIdOrUserId: string): void {
  if (!startupIdOrUserId) return;
  const cached = contextCache.get(startupIdOrUserId);
  if (cached && cached.context?.metadata) {
    if (cached.context.metadata.startupId) {
      contextCache.delete(cached.context.metadata.startupId);
    }
    if (cached.context.metadata.ownerId) {
      contextCache.delete(cached.context.metadata.ownerId);
    }
  }
  contextCache.delete(startupIdOrUserId);
}
```
Whenever an approval executes or is rejected, both `startup.id` and `startup.ownerId` are purged simultaneously. The next request to `companyContextService.getContextForUser()` or `getContextForStartup()` reconstructs the context directly from PostgreSQL.

---

## 6. Approval Idempotency

To prevent duplicate execution from double clicks, network retries, or browser refreshes:
1. **Pre-execution Check:**
   If `approval.status !== 'pending_review'`, `reviewApproval` immediately halts:
   ```typescript
   if (currentStatus !== 'pending_review') {
     return {
       success: true,
       alreadyProcessed: true,
       message: `Approval has already been processed with status: "${currentStatus}". Duplicate execution prevented.`,
       item: deliverable,
       startupProfile: await this.buildStartupProfile(startup)
     };
   }
   ```
2. **State Protection:**
   Subsequent review calls return HTTP 200 with `alreadyProcessed: true` and the existing state. No second deduction or headcount increment occurs.

---

## 7. Failure Handling

If an operational execution fails (e.g. database constraint violation, external API error, or simulated subsystem failure):
1. **Status Transition:** `Approval.status` is updated to `'execution_failed'`.
2. **Execution Ledger:** `prisma.execution.create` records status `'failed'` with error payload.
3. **Decision Audit:** `prisma.decisionLog.create` logs the failure.
4. **State Preservation:** No mutations are applied to `Startup.cashBalance`, `Startup.burnRate`, or `Memory.TEAM_SIZE`.
5. **Context Integrity:** Cached context is not mutated with false updates. Returns HTTP 500 with diagnostic message.

---

## 8. Multi-Tenant Authorization

Approval operations are guarded at the service and route layer:
1. **Authentication Required:** Requests without a valid JWT return HTTP 401 Unauthorized.
2. **Role Enforced:** Users with `role === 'Executive'` cannot approve deliverables (HTTP 403 Forbidden). Only `Founder` or `Admin` roles can sign off.
3. **Cross-Tenant Isolation:**
   When reviewing approval `approvalId`:
   ```typescript
   const startup = approval.plan?.startup;
   if (!startup || startup.ownerId !== userId) {
     return {
       success: false,
       statusCode: 403,
       error: 'Forbidden: You do not have permission to review approvals for another company.'
     };
   }
   ```
   Company A founders cannot view, approve, or reject Company B's approvals.

---

## 9. Audit Trail Architecture

CatalystOS reuses existing PostgreSQL models for full auditability:
- **`Execution`:** Records exact action, input parameters, deltas applied, plan ID, and execution status (`'completed'` or `'failed'`).
- **`DecisionLog`:** Immutable executive record storing title, founder feedback, category, financial impact, status (`'approved'`, `'rejected'`, `'failed'`), and timestamp.
- **`TimelineItem`:** Corporate milestones and key events (`type: 'hire'`, `'financial'`, `'deliverable'`, `'rejection'`).

---

## 10. AI Feedback Loop

Closing the loop between approval execution and AI reasoning:
1. Founder issues command: *"Can we hire 2 senior engineers?"*
2. AI Chief of Staff evaluates current context (Burn $25k, Runway 20 months).
3. AI generates hiring approval deliverable with projected impact.
4. Founder reviews and approves in Approval Center.
5. `approvalService.reviewApproval` executes state change: Burn becomes $41k, Runway becomes 12.2 months, Team becomes 7 engineers. Context cache is invalidated.
6. Founder issues follow-up command: *"What is our hiring capacity and remaining runway?"*
7. AI Chief of Staff pulls fresh `CompanyContext`:
   ```markdown
   ### FINANCIAL SNAPSHOT (DETERMINISTIC GROUND TRUTH)
   - Treasury Cash: $500,000
   - Monthly Net Burn: $41,000/mo
   - Verified Runway: 12.2 months
   - Team Structure: 7 engineers
   - Pending Approvals Count: 0
   ```
8. The AI Chief of Staff and specialist agents (CFO, Talent, COO) immediately reason over the updated parameters without stale-context hallucinations.

---

## 11. Automated Test Suite

Implemented in `tests/approvalContext.test.ts` (67 automated assertions) alongside `tests/companyContext.test.ts` (47 automated assertions):

| Test Scenario | Purpose | Result |
|---|---|---|
| **1. Approval Creation** | Verifies agent can create structured approval linked to plan | ✅ PASS |
| **2. Authorization** | Enforces unauthenticated (401) and executive role (403) rejection | ✅ PASS |
| **3. Cross-Tenant Isolation** | Verifies Company A cannot approve Company B's approval | ✅ PASS |
| **4. Approval Execution** | Verifies state changes persist to PostgreSQL `Startup`, `Memory`, `DecisionLog` | ✅ PASS |
| **5. Idempotency** | Verifies duplicate approvals do not double-mutate metrics or execute twice | ✅ PASS |
| **6. Rejection Handling** | Verifies rejection logs feedback without modifying financial metrics | ✅ PASS |
| **7. Failure Boundary** | Verifies failed execution marks `execution_failed` and preserves state | ✅ PASS |
| **8. Context Freshness** | Verifies `companyContextService.getContextForUser` rebuilds fresh state | ✅ PASS |
| **9. Non-State-Changing** | Verifies document/marketing approvals do not alter unrelated metrics | ✅ PASS |
| **10. AI Feedback Loop** | Verifies `toPromptContext('CEO')` includes updated cash, burn, and runway | ✅ PASS |

**Test Execution Results:**
```text
tests/approvalContext.test.ts: 67 PASSED | 0 FAILED
tests/companyContext.test.ts:  47 PASSED | 0 FAILED
Total Automated Tests:        114 PASSED | 0 FAILED
TypeScript Compilation:        PASS (0 errors)
```

---

## 12. Remaining Limitations

Preserved from Task 4 per strict scope instructions:
1. **Single-Owner Startup Model:** `Startup` currently links to a single `ownerId`. Multi-user collaborative `Membership` table remains an upcoming task.
2. **FastAPI Context Endpoint:** The secondary Python FastAPI service queries single-record startup context rather than tenant-filtered queries.
