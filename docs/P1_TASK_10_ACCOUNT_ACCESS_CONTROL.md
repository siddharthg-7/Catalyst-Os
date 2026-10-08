# P1 Task 10 — Account Access Control (`people:access`)

Status: **Implemented & Verified**. No schema change, no migration required.

This task establishes the boundary between **managing company personnel records** (the internal roster) and **controlling software accounts** (inviting users and suspending accounts).

---

## 1. Executive Summary & Premise Clarification

### The Core Problem
In earlier iterations (Tasks 7–9):
1. **Roster records vs. User accounts**: CatalystOS maintains two concepts of a person:
   - A `TEAM_MEMBER` memory record representing an internal company employee/contractor.
   - A `Membership` record tying an authenticated `User` account to a `Startup` tenant.
2. **The Vulnerability in Task 9**: `DELETE /api/memberships/:id` was guarded by `people:write`. Because `HR` held `people:write` to manage the team roster, an HR officer had the authority to suspend authenticated user accounts and revoke executive logins.
3. **The Premise Correction**: Prior to Task 10, `HR` **never** held `people:invite` (invitations were restricted to `FOUNDER` and `ADMIN` in Task 8). The genuine security gap was exclusively membership suspension (`DELETE /api/memberships/:id`).

### The Solution: Unifying Under `people:access`
Rather than introducing fragmented permissions, **`people:access` subsumes and replaces `people:invite`**. The entire account-access lifecycle—inviting new accounts, resending invites, revoking pending invites, and suspending active memberships—is now governed by the single `people:access` permission.

---

## 2. Permission Matrix

| Role | `people:read` | `people:write` | `people:access` | Roster Management | Account Invites / Revocations |
|---|:---:|:---:|:---:|:---:|:---:|
| **FOUNDER** | ✅ | ✅ | ✅ | Full Control | Full Control |
| **ADMIN** | ✅ | ✅ | ✅ | Full Control | Full Control |
| **HR** | ✅ | ✅ | ❌ | Can add/edit/delete roster | **Forbidden (403)** |
| **FINANCE** | ✅ | ❌ | ❌ | Read Only | **Forbidden (403)** |
| **OPERATIONS** | ✅ | ❌ | ❌ | Read Only | **Forbidden (403)** |
| **GROWTH** | ✅ | ❌ | ❌ | Read Only | **Forbidden (403)** |

### Resolution of Non-HR Access (Preserving Directory & Navigation)
- `FINANCE`, `OPERATIONS`, and `GROWTH` retain `people:read` and the `people` sidebar area.
- This ensures non-HR roles can view the directory without encountering 403 errors on sidebar navigation or `GET /api/team` requests.

---

## 3. Route & Middleware Audit

### Protected by `requirePermission('people:access')`
- `POST /api/invitations` — Issue a new company invitation.
- `POST /api/invitations/:id/resend` — Re-issue a pending invitation.
- `DELETE /api/invitations/:id` — Revoke a pending invitation.
- `DELETE /api/memberships/:id` — Suspend a company membership and revoke account access.

### Protected by `requirePermission('people:write')` (Roster Only)
- `POST /api/team` — Add a team member to the internal roster.
- `PUT /api/team/:id` — Update a team member's roster details.
- `DELETE /api/team/:id` — Remove an entry from the internal roster.

### Protected by `requirePermission('people:read')` (Directory Access)
- `GET /api/team` — View the unified roster and account list.
- `GET /api/memberships` — View active company accounts.

### Intentionally Ungated by `people:access`
- `POST /api/invitations/accept` — **Public candidate acceptance**. Candidates accepting an invitation do not hold a company role yet; they are authenticated or newly registered users presenting a cryptographically signed invitation token.

---

## 4. Permissions API & Typing Extension

### Endpoint: `GET /api/permissions/me`
In addition to the raw string list `permissions: string[]`, the endpoint returns a typed convenience breakdown:

```json
{
  "role": "HR",
  "permissions": ["people:read", "people:write", ...],
  "people": {
    "read": true,
    "write": true,
    "access": false
  }
}
```

### TypeScript Types (`src/types.ts`)
```typescript
export interface UserPermissions {
  role: string;
  permissions: string[];
  areas?: string[];
  people?: {
    read: boolean;
    write: boolean;
    access: boolean;
  };
}
```

---

## 5. Frontend Alignment (`src/components/PeopleDirectory.tsx`)

The frontend respects the backend authorization model:
- **Invite Button & Dialog**: Rendered only when `permissions.people.access === true`.
- **Remove Account Action**: The "Revoke Access" / "Remove Account" button is hidden for users lacking `people:access` (including `HR`).
- **Roster Actions**: `HR` retains full control over the roster (Add Member, Edit Role/Department, Remove from Roster).

---

## 6. Test Verification

### Test Suite: `tests/accountAccessControl.test.ts`
A dedicated test suite was built and verified against the live PostgreSQL database:

1. **Static Permission Matrix (17 assertions)**:
   - Validates that `FOUNDER` and `ADMIN` hold `people:access`, `people:write`, and `people:read`.
   - Validates that `HR` holds `people:write` and `people:read`, but NOT `people:access`.
   - Validates that `FINANCE`, `OPERATIONS`, and `GROWTH` hold `people:read` and their sidebar area, but NOT `people:access` or `people:write`.
2. **Middleware Access Guard (7 assertions)**:
   - Verifies HTTP 200 for `FOUNDER` and `ADMIN` on `requirePermission('people:access')`.
   - Verifies HTTP 403 for `HR`, `FINANCE`, `OPERATIONS`, and `GROWTH`.
   - Verifies HTTP 401 for unauthenticated requests.
3. **Middleware Roster Guard (6 assertions)**:
   - Verifies HTTP 200 for `HR` on `requirePermission('people:write')`.
   - Verifies HTTP 403 for `FINANCE`, `OPERATIONS`, and `GROWTH`.
4. **Invitation Access Actions (5 assertions)**:
   - Verifies creation, resending, and acceptance flow with token renewal and database membership creation.
5. **Membership Suspension Account-Access Action (2 assertions)**:
   - Verifies that a Founder can suspend an active membership, resulting in immediate loss of company access.
6. **Cross-Tenant Account-Access Isolation (4 assertions)**:
   - Validates that Company B actors cannot suspend memberships or revoke invitations belonging to Company A.
7. **Effective Permissions Structure (9 assertions)**:
   - Validates `GET /api/permissions/me` payload structure and convenience booleans across roles.

**Test Run Output**:
```text
========================================================================
  P1 TASK 10 — ACCOUNT ACCESS CONTROL (people:access)
========================================================================
  RESULTS: 55 passed, 0 failed
========================================================================
```

### Full Regression Test Summary
- `tests/accountAccessControl.test.ts`: **55 passed, 0 failed**
- `tests/membershipRemoval.test.ts`: **62 passed, 0 failed**
- `tests/membershipInvitations.test.ts`: **89 passed, 0 failed**
- TypeScript Typecheck (`npm run lint` / `tsc --noEmit`): **Clean (0 errors)**
- Production Build (`npm run build`): **Clean (Vite + esbuild bundle generated)**

---

## 7. Files Changed

**Added**:
- `tests/accountAccessControl.test.ts` — Comprehensive test suite for Task 10.
- `docs/P1_TASK_10_ACCOUNT_ACCESS_CONTROL.md` — Implementation & verification document.

**Modified**:
- `backend/services/permissionService.ts` — Defined `people:access` permission, assigned to `FOUNDER` and `ADMIN`, removed from `HR`.
- `backend/routes/api.ts` — Applied `requirePermission('people:access')` to invitation and membership removal routes; exposed `people: { read, write, access }` in `GET /api/permissions/me`; resolved legacy `healthScore` typing issue.
- `src/types.ts` — Added `people` convenience boolean object to `UserPermissions`.
- `src/components/PeopleDirectory.tsx` — Enforced UI hiding for account-access actions based on `people:access`.
- `package.json` — Registered `tests/accountAccessControl.test.ts` in the test script.
