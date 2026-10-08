# P1 Task 9 — Membership Removal + People Reconciliation

Status: **Implemented**. No schema change, no migration required.

This task closes the two inconsistencies Task 8 left behind:

1. `DELETE /api/team/:id` only operated on legacy `TEAM_MEMBER` Memory rows —
   there was no way to revoke an authenticated member's access.
2. The People page could show the same person twice: once under Company Accounts
   and once on the roster.

Prerequisite reading: [`P1_TASK_8_MEMBERSHIP_INVITATIONS.md`](./P1_TASK_8_MEMBERSHIP_INVITATIONS.md).

---

## 1. Membership removal behaviour

**Endpoint**: `DELETE /api/memberships/:id`

```text
authenticateJWT -> requireActiveMembership -> requirePermission('people:write')
      -> resolveCallerStartupId()  (company from the CALLER's own membership)
      -> removeMembership(startupId, membershipId, actingUserId)
```

`membershipService.removeMembership()` performs the checks in this order:

| Check | Failure |
|---|---|
| Target exists **within the caller's company** | `404 NOT_FOUND` |
| Target is not the company owner | `403 OWNER_PROTECTED` |
| Target is currently `ACTIVE` | `409 ALREADY_REMOVED` |

On success it sets `status = 'SUSPENDED'`, writes a `TimelineItem` audit entry
(`Access Revoked: <name>`, matching how member additions are already recorded),
logs the actor, and returns the removed member plus
`userAccountRetained: true`.

The route mirrors the existing conventions: a typed `MembershipError` carrying an
HTTP status and a code, mapped to the response exactly as `InvitationError` is.

## 2. Owner protection

The owner is `Startup.ownerId` — unchanged by this task.

`removeMembership()` compares `membership.startup.ownerId === membership.userId`
and rejects with `403 OWNER_PROTECTED` before touching anything. This applies
**including when the founder targets their own membership**, so the company can
never be left without an owner.

`GET /api/memberships` now returns `isOwner` and `isSelf` per row so the People
page can render an "Owner" chip instead of a remove button. That is UX only — the
backend rejects the operation regardless of what the client renders.

`Startup.ownerId` architecture was not modified.

## 3. Suspend vs delete — decision

**Chosen: Option A, suspend (`status = 'SUSPENDED'`).** No schema change needed;
`Membership.status` already supported it.

Reasons:

- **Access is lost immediately.** `resolveMembership()` already filters
  `status: 'ACTIVE'`, so a suspended member stops resolving the instant the row is
  updated — no session invalidation step, no cache to clear.
- **Auditability.** The row records that this person once had access, in what role,
  which a hard delete would destroy. `listMemberships(id, { includeSuspended: true })`
  retrieves it.
- **Rejoin is clean.** The `@@unique([userId, startupId])` constraint means a hard
  delete followed by a re-invite would churn rows; reactivating the existing row
  guarantees exactly one membership per person per company (see §7).
- **It is simpler, not more complex.** It is a single-field update that reuses the
  status column and filter that already existed.

Cost: `Company Accounts` must filter on status. `listMemberships()` therefore
defaults to `ACTIVE` only, with an opt-in `includeSuspended` flag for audit reads.

## 4. Session authorization behaviour

This was the most important correctness issue in the task, and the code **did have
a real hole**.

`attachMembershipRole` (Task 8) only *hydrates* the role: when no membership
resolves, it leaves `req.user.role` as whatever the JWT claimed. After a removal,
the member still holds an unexpired token claiming e.g. `FINANCE` — or, if they
had been an admin, `ADMIN`. On routes that scope by company the damage was limited
to a `404`, but `/api/approvals/:id/review` and `/api/approvals/:id/reverse`
operate on **module-level in-memory arrays** (`backend/state.ts`), so company
scoping would not have saved them. A revoked member could have reviewed approvals.

### The fix

A new fail-closed guard, `membershipService.requireActiveMembership`:

```text
authenticateJWT -> requireActiveMembership -> requirePermission(...)
                        │
                        ├─ no req.user            -> 401
                        ├─ no ACTIVE membership
                        │  and not an owner       -> 403 NO_ACTIVE_MEMBERSHIP
                        └─ otherwise: req.user.role = membership.role (overwrite)
```

Membership is authoritative: the token's `role` claim is overwritten, so it can
neither escalate nor preserve privileges.

`requireActiveMembership` replaced `attachMembershipRole` on all 12
company-scoped routes:

`GET/POST/DELETE /api/team`, `GET /api/memberships`,
`DELETE /api/memberships/:id`, `GET/POST /api/invitations`,
`POST /api/invitations/:id/resend`, `DELETE /api/invitations/:id`,
`POST /api/approvals/:id/review`, `POST /api/approvals/:id/reverse`,
`POST /api/startup`, `PUT /api/company/policies`.

`attachMembershipRole` is deliberately **retained** on `GET /api/permissions/me`
and `GET /api/membership/me`, which must still answer for a user who has no
company yet (a founder mid-onboarding). Those endpoints report
`startupId: null` rather than rejecting.

No manual logout is required, and no token revocation list was introduced — the
database is consulted on every company-scoped request.

## 5. People reconciliation

**Account source**: `GET /api/memberships` — `Membership` joined to `User`, `ACTIVE` only.
**Roster source**: `GET /api/team` — `Memory` rows with `category: 'TEAM_MEMBER'`.

`GET /api/team` now annotates each roster entry:

```ts
hasAccount: boolean      // matches an ACTIVE membership in this company
linkedUserId: string | null
```

The frontend (`PeopleDirectory.tsx`) derives `rosterOnly` by excluding entries
where `hasAccount` is true, or whose email matches a membership email. The second
check is belt-and-braces so the UI stays correct even against a cached or older
API response.

`GET /api/team` also had a separate bug fixed here: it resolved the company via
`ownerId` only, so **an invited member always received an empty roster**. It now
resolves through `getActiveStartupId()`. `POST /api/team` and
`DELETE /api/team/:id` had the same defect — an `HR` member holding `people:write`
could not add or remove roster entries — and were fixed the same way.
`DELETE /api/team/:id` remains tenant-scoped (its `deleteMany` still filters on the
resolved `startupId`).

### Matching strategy

Email, normalised with `trim()` + `toLowerCase()` on both sides. Email is already
the canonical user identifier in this codebase (`User.email` is `@unique`, and
invitations are addressed and matched by email), so it is the correct key, and
`TEAM_MEMBER` Memory has no stronger identifier — its `description` JSON carries
`email` and nothing else identity-bearing.

Matching is **never** done on name, role, or fuzzy similarity. A roster entry with
no email simply never matches and stays roster-only.

## 6. Roster vs account distinction

| | `Memory(category: 'TEAM_MEMBER')` | `Membership` |
|---|---|---|
| Means | On the company roster | Has a CatalystOS account **and** access |
| Has a `User` | No | Always |
| Can sign in | No | Yes |
| Created by | `POST /api/team` | Accepting an invitation |
| Removed by | `DELETE /api/team/:id` | `DELETE /api/memberships/:id` |
| Shown under | Roster ("No account") | Company Accounts |

The two were **not** merged. Legacy roster rows are never auto-deleted when
someone gains an account — the aggregation layer simply lets the account take
precedence. This is why removal degrades gracefully:

```text
Before:  John -> Company Accounts (Active)
Remove access
After:   John -> Roster ("No account")        [if a roster Memory exists]
         John -> absent from People           [if no roster Memory exists]
```

## 7. Re-invitation behaviour

Two Task 8 defects blocked this and were fixed:

1. **`ALREADY_MEMBER` fired on any membership**, including `SUSPENDED` — so a
   removed person could never be re-invited. It now only fires when the existing
   membership is `ACTIVE`.
2. **`ensureMembership()` never reactivated** a suspended row; it returned it
   as-is, so acceptance would have "succeeded" while leaving the person without
   access. It now updates `status -> ACTIVE` and applies the **new** role.

```text
Member removed (SUSPENDED, role FINANCE)
      -> User account retained
      -> Founder invites the same email with role OPERATIONS
      -> Invitation accepted
      -> existing membership reactivated: status ACTIVE, role OPERATIONS
```

The old role is **not** restored implicitly — the role comes from the new
invitation, which is explicit and avoids silently re-granting privileges someone
previously held. Exactly one membership row results (the unique constraint
guarantees it), and no duplicate `User` is created.

## 8. Tenant isolation

The caller's company is always derived from their own membership via
`resolveCallerStartupId()`. `startupId` / `companyId` are **never** read from the
request body or query string on any of these routes.

`removeMembership(startupId, membershipId, …)` puts `startupId` in the `WHERE`
clause, so a membership id belonging to another company is indistinguishable from
a non-existent one and returns `404 NOT_FOUND` — no existence oracle.

Verified both directions: A cannot remove B's member, and B cannot remove A's
owner membership.

## 9. Tests

`tests/membershipRemoval.test.ts`, registered in `npm test`. It builds its own two
throwaway companies and deletes everything in a `finally` block.

| Group | Covers |
|---|---|
| Removal | Suspends rather than deletes; row retained as audit; access lost immediately; `resolveMembership` returns null |
| User preservation | `User` row, credentials and identity all intact after removal |
| Owner protection | Owner membership not removable by another actor **or by the founder themselves**; stays `ACTIVE`; founder keeps `FOUNDER` |
| Repeat / missing | Second removal -> `ALREADY_REMOVED`; unknown id -> `NOT_FOUND` |
| Cross-company | A cannot remove B's member (B untouched); B cannot remove A's owner |
| Session security | Active member passes; **the same unexpired session is denied 403 `NO_ACTIVE_MEMBERSHIP` after removal**; a stale `FOUNDER` claim on a revoked session is still denied on `approvals:review`; owner unaffected; a company-less user with a `FOUNDER` claim is denied; `attachMembershipRole` still passes that user through |
| Re-invitation | Removed member is re-invitable; new role carried; no second `User`; user count unchanged; exactly one membership row; reactivated as `ACTIVE` with the **new** role; session resolves to the new role over a stale claim; an `ACTIVE` member still cannot be re-invited |
| Accounts listing | Suspended excluded; rejoined included; owner included; all `ACTIVE`; `includeSuspended` still retrieves audit rows; confined to one company |
| Reconciliation | Roster-only appears once; a person with both appears only under Company Accounts; case-insensitive email matching (roster entry stored upper-case); roster Memory preserved; after removal they reappear as roster-only |
| Removal authorization | `FOUNDER`/`ADMIN`/`HR` may remove (all hold `people:write`); `FINANCE`/`OPERATIONS`/`GROWTH` -> 403; unauthenticated -> 401 |

## 10. Remaining limitations

1. **`HR` can remove company accounts.** This follows directly from the Task 7
   matrix, where `HR` holds `people:write`. It may be intended (HR manages people)
   or may warrant splitting `people:write` into roster-write vs access-revoke. Not
   changed here, because Task 9 forbids altering the permission matrix — but it is
   a deliberate policy decision worth confirming.
2. **No un-suspend endpoint.** Reactivation happens only through re-invitation.
   A direct `PATCH /api/memberships/:id { status: 'ACTIVE' }` does not exist.
3. **Suspended members are invisible in the UI.** The audit rows exist and are
   retrievable via `includeSuspended`, but no screen surfaces them.
4. **Roster entries are not auto-created on acceptance.** Someone who joins purely
   by invitation has no `TEAM_MEMBER` Memory, so after removal they vanish from
   People entirely (documented behaviour in §6, not a defect, but it means removal
   is less visible for invite-only members).
5. **`DELETE /api/team/:id` and `DELETE /api/memberships/:id` remain separate.**
   Removing a person who exists in both lists is two operations. Intentional —
   they mean different things — but a combined "remove person entirely" action
   does not exist.
6. **One company per user** still applies (`resolveMembership` takes the oldest
   active membership); no company switcher.
7. **`requireActiveMembership` is mounted per-route**, so a new company-scoped
   route must opt in. A route that forgets it falls back to the JWT role.
8. **`GET /api/team` now returns 403 instead of `[]`** for a user with no company.
   More correct, and the frontend tolerates it (`Promise.allSettled` + `.ok`
   checks), but it is a response-code change for that edge case.
9. **A pre-existing, unrelated TypeScript error** remains at `backend/routes/api.ts`
   (`healthScore` missing on an object literal). It predates Tasks 7–9 and is not
   in `HEAD`; left alone.

---

## Files changed

**Added**
- `tests/membershipRemoval.test.ts`
- `docs/P1_TASK_9_MEMBERSHIP_REMOVAL_RECONCILIATION.md`

**Modified**
- `backend/services/membershipService.ts` — `removeMembership`, `requireActiveMembership`,
  `MembershipError`; `ensureMembership` reactivates suspended rows; `listMemberships`
  filters on `ACTIVE`
- `backend/services/invitationService.ts` — `ALREADY_MEMBER` only for `ACTIVE` memberships
- `backend/routes/api.ts` — `DELETE /api/memberships/:id`; `requireActiveMembership` on
  12 company-scoped routes; `/api/team` reconciliation + membership-based company
  resolution; `isOwner`/`isSelf` on `/api/memberships`
- `src/components/PeopleDirectory.tsx` — roster de-duplication, "No account" badge,
  Remove-access action, protected Owner chip
- `src/App.tsx` — `handleRemoveMembership`, `refreshMemberships`, `hydrateTeam`
- `src/types.ts` — `hasAccount`/`linkedUserId` on `TeamMember`; `isOwner`/`isSelf` on
  `CompanyMembership`
- `package.json` — test script includes the new suite

**Database**: no schema change, no migration. `Membership.status` was sufficient.
