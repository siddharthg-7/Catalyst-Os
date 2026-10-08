# P1 Task 8 — Membership + Invitations

Status: **Implemented**. Migration applied to the development Neon database; founder
memberships backfilled.

This task establishes the identity relationship CatalystOS was missing:

```text
User  ->  Membership  ->  Startup / Company  ->  Role  ->  Permissions
```

It deliberately does **not** implement role-specific dashboards, AI permission
routing, approval routing by employee, or any P2+ work.

---

## 1. Why Membership was introduced

Before this task, a company had exactly one human: `Startup.ownerId`. There was
no way to express "this person also works here".

Team members were stored as `Memory` rows with `category: 'TEAM_MEMBER'`. That
is adequate for *displaying* a roster, but it cannot support authentication,
because a `Memory` row is not an identity — it has no `User`, no credentials, and
no access. Any attempt to let an employee sign in would have had to invent a
parallel identity system.

`Membership` is that missing join: it says *this `User` has access to this
`Startup` in this role*. Everything downstream (permissions, company context,
People, and later AI and approval routing) can now resolve uniformly through it.

## 2. Existing `ownerId` compatibility

`Startup.ownerId` is **unchanged and still authoritative for ownership**. Nothing
was removed or renamed, so all pre-existing P0 behaviour continues to work.

Compatibility is handled in two layers:

1. **Backfill** — every existing startup's owner was given an explicit
   `FOUNDER` membership, so ownership and membership agree.
2. **Runtime fallback** — `membershipService.resolveMembership()` checks
   `Membership` first and then falls back to `Startup.ownerId`. A founder whose
   membership row is missing (fresh database, backfill not yet run, a startup
   created by an older code path) still resolves as `FOUNDER`. The result carries
   `viaOwnership: true` so callers can tell which path was taken.

This means the migration cannot lock a founder out of their own company, even if
the backfill never runs.

## 3. Membership schema

```prisma
model Membership {
  id        String   @id @default(uuid())
  userId    String
  startupId String
  role      String   @default("OPERATIONS")  // one of permissionService.ROLES
  status    String   @default("ACTIVE")      // ACTIVE | SUSPENDED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  startup   Startup  @relation(fields: [startupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, startupId])
  @@index([startupId])
  @@index([userId])
}
```

Notes on the state model, which is intentionally minimal:

- Status is only `ACTIVE | SUSPENDED`. There is **no `INVITED` membership state**:
  a `Membership` row is created only on successful acceptance, so its existence
  always means "this person really has access". Invited-but-not-yet-joined is a
  property of the `Invitation`, not of a membership. This keeps "is this user a
  member?" a single existence check with no status interpretation.
- `@@unique([userId, startupId])` is the database-level guarantee against
  duplicate memberships. It is compatible with the invitation lifecycle because
  acceptance is the only writer, and it checks for an existing row first.

## 4. Invitation schema

```prisma
model Invitation {
  id          String    @id @default(uuid())
  startupId   String
  email       String
  role        String                          // one of permissionService.ROLES
  tokenHash   String    @unique               // SHA-256 hex; never exposed
  status      String    @default("PENDING")   // PENDING | ACCEPTED | EXPIRED | REVOKED
  expiresAt   DateTime
  invitedById String
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  startup     Startup   @relation(fields: [startupId], references: [id], onDelete: Cascade)
  invitedBy   User      @relation("InvitationInvitedBy", fields: [invitedById], references: [id], onDelete: Cascade)

  @@index([startupId, status])
  @@index([email])
}
```

## 5. Invitation lifecycle

```text
                    createInvitation()
                           │
                           ▼
                       PENDING ──────────────┐
                           │                 │
          acceptInvitation()│                 │ revokeInvitation()
                           │                 │ or superseded by resend
                           ▼                 ▼
                       ACCEPTED           REVOKED
                           │
                 expiresAt passes (no job needed)
                           ▼
                        EXPIRED
```

`ACCEPTED`, `REVOKED` and `EXPIRED` are terminal — `acceptInvitation()` rejects
all three.

Expiry is **derived, not swept**: `deriveStatus()` reports a `PENDING` row whose
`expiresAt` has passed as `EXPIRED`. No cron job or background worker is needed,
and an expired row can never be accepted even if its stored status still says
`PENDING`.

## 6. Authentication flow

Invitation acceptance reuses the **existing** auth architecture — the same
bcrypt hashing and the same JWT contract (`{ sub, email, name, role }`, 7-day
expiry) issued by `/api/auth/signin`. No second authentication system was built.

```text
Founder/Admin ──> POST /api/invitations ──> Invitation (PENDING) ──> email / dev link
                                                      │
Invitee opens /accept-invitation?token=<raw>           │
       │                                               │
       ├─ GET  /api/invitations/accept/:token  ─────────┘   (preview: company, role, requiresAccount)
       │
       └─ POST /api/invitations/accept
                   │
                   ▼
            one transaction:
              claim invitation (PENDING -> ACCEPTED)
              create User if new  /  reuse User if existing
              create Membership
                   │
                   ▼
            sign JWT (existing contract) ──> /dashboard
```

`POST /api/invitations/accept` and the preview endpoint are intentionally
**public**: a brand-new invitee has no account and therefore cannot present a
Bearer token. The raw token *is* the authorization. Both endpoints sit behind
`authRateLimiter`. When a Bearer token *is* present, the route decodes it and
passes `authenticatedUserId` down so acceptance is bound to that account.

## 7. Role assignment

Roles come entirely from Task 7's `permissionService.ROLES`. No new enum, no
second permission map.

```text
Invitation.role ──> validateInvitableRole() ──> Membership.role ──> permissionService ──> capabilities
```

- `INVITABLE_ROLES` = `ROLES` minus `FOUNDER`. `FOUNDER` belongs to the venture
  owner and cannot be handed out by invitation.
- `validateInvitableRole()` runs on **creation and again on acceptance**, so a
  role that became invalid between the two is still rejected.
- The client-supplied role is never trusted: it is upper-cased and checked
  against the allow-list, and anything else returns `400 INVALID_ROLE`.

## 8. Permission integration

Invitation endpoints reuse Task 7's `requirePermission` rather than introducing
new permissions:

| Endpoint | Permission |
|---|---|
| `GET /api/invitations`, `GET /api/memberships` | `people:read` |
| `POST /api/invitations` | `people:invite` |
| `POST /api/invitations/:id/resend` | `people:invite` |
| `DELETE /api/invitations/:id` | `people:invite` |
| `GET /api/membership/me` | authenticated only |
| `GET /api/invitations/accept/:token`, `POST /api/invitations/accept` | public (token is the credential) |

In Task 7's map only `FOUNDER` and `ADMIN` hold `people:invite`, so `FINANCE`,
`HR`, `OPERATIONS` and `GROWTH` receive `403`. **This is enforced on the
backend** — hiding the Invite button is not the control.

### Making Membership authoritative for authorization

`requirePermission` is synchronous and reads `req.user.role`, which comes from
the JWT. A new middleware bridges the gap without rewriting the permission layer:

```ts
authenticateJWT  ->  attachMembershipRole  ->  requirePermission(...)
```

`attachMembershipRole` (in `membershipService.ts`) replaces `req.user.role` with
the caller's **membership** role, so downstream checks run against the company
role rather than the `User.role` column. If no membership resolves, `req.user.role`
is left untouched — preserving pre-Task-8 behaviour.

It is mounted on the routes where role differentiation actually matters: the
team/membership/invitation routes, both approval endpoints, `POST /api/startup`,
`PUT /api/company/policies`, and `GET /api/permissions/me`. This is deliberately
narrower than a global rewrite.

`GET /api/permissions/me` now also returns `startupId` and `isOwner`, and derives
its role via `getEffectivePermissions()`.

#### Side effect: the JWT role claim stops being trusted

Because `attachMembershipRole` **overwrites** `req.user.role` with the membership
role, the `role` claim inside a JWT no longer decides anything on those routes.
This was confirmed end-to-end against the running server:

- A token minted with `role: 'FINANCE'` for a user whose membership is `FOUNDER`
  still succeeded at `POST /api/invitations` — the membership (`FOUNDER`) won.
- An accepted `HR` member's real session was **denied** `POST /api/invitations`
  with `403`, and `GET /api/permissions/me` reported
  `role: HR, canInvite: false, canReview: false, areas: 5`.

So the claim can neither escalate nor downgrade privileges: a stale token issued
before a role change, or a forged claim, is ignored in favour of the database.
That is the intended direction (the database is authoritative), and it is
stronger than the pre-Task-8 behaviour, where the JWT claim was the only input.

The one consequence worth knowing: a user's effective role changes the moment
their membership changes, without re-issuing their token.

## 9. Tenant isolation

Every invitation and membership operation is scoped to the caller's own company:

1. `resolveCallerStartupId()` derives the company from the **authenticated user's
   membership** — never from a client-supplied id. There is no request parameter
   that can name a different company.
2. `revokeInvitation(startupId, id)` and `resendInvitation(startupId, id, …)` put
   `startupId` in the `WHERE` clause, so a cross-company id returns `404 NOT_FOUND`
   rather than acting on another tenant's row.
3. `listInvitations(startupId)` and `listMemberships(startupId)` are filtered by
   company.
4. `isMemberOf(userId, startupId)` is the single guard for "does this user belong
   to that company".

Tests cover Company A attempting to revoke, resend, and list Company B's
invitations and memberships.

## 10. Existing team-member compatibility

**Nothing about the existing People system was removed or migrated.** This is
Option B (bridge), chosen because the two things model genuinely different
concepts — as the task description itself notes.

| | `Memory(category: 'TEAM_MEMBER')` | `Membership` |
|---|---|---|
| Represents | A person on the roster | An account with access |
| Has a `User`? | No | Yes, always |
| Can sign in? | No | Yes |
| Created by | `POST /api/team` | Accepting an invitation |
| Shown as | "Active Team" | "Company Accounts" |

A company can list someone in People without that person having a CatalystOS
account — an intentional and useful state. Existing `TEAM_MEMBER` rows were
therefore **not** converted into `User` records, which would have fabricated
accounts (and credentials) for people who never asked for them. The development
database had 0 `TEAM_MEMBER` rows at migration time, so nothing was at risk either way.

`GET/POST/DELETE /api/team` are unchanged in behaviour; they only gained the
`attachMembershipRole` middleware.

### Transitional state (explicit)

This is a bridge, not a permanent dual source of truth:

- **Membership is authoritative** for *access, roles and authorization*. There is
  no competing source for those.
- **`TEAM_MEMBER` Memory is authoritative** only for *roster display* of people
  without accounts.

These do not overlap, so there is no ambiguity about which to trust for a given
question. The intended convergence is that once a roster entry's person accepts an
invitation, the roster entry becomes redundant and the People page shows them under
Company Accounts. Reconciling the two lists — matching by email, hiding a roster
entry once a membership exists, and migrating removal to operate on `Membership` —
is the follow-up, and is listed under *Remaining limitations*.

## 11. Migration strategy

Nothing was reset, dropped, or recreated. No existing table was altered.

**Migration**: `prisma/migrations/20261008000000_add_membership_and_invitation/migration.sql`
— two `CREATE TABLE` statements plus indexes and foreign keys. Generated with
`prisma migrate diff` and verified to contain no `DROP` or `TRUNCATE`, then applied
with `prisma db execute`. (`prisma migrate dev` was avoided: this project has never
had a migrations directory, so a baseline attempt risked a reset.)

**Backfill**: `prisma/backfillMemberships.ts` gives each existing startup's owner a
`FOUNDER` membership.

```bash
npx tsx prisma/backfillMemberships.ts --dry-run   # report only
npx tsx prisma/backfillMemberships.ts             # apply
```

It is idempotent — it creates only missing rows and never updates or deletes, so
it is safe (and intended) to re-run after new startups are created. Startups made
by an older code path, or created after the first run, simply pick up their
founder membership on the next run; until then the ownership fallback in §2
covers them.
It skips a startup with no `ownerId` or whose owner is not a `User`, with a warning,
rather than failing the whole run.

Verified on the development database: 4 startups, 4 memberships created; a second
run reported `0 created, 4 already present`. User, startup and memory counts
unchanged.

## 12. Security considerations

**Token handling**

- 32 bytes (256 bits) from `crypto.randomBytes` — not guessable.
- Only the **SHA-256 hash** is stored. The raw token exists in memory during the
  request and inside the invitation URL handed to the mailer. It is never
  persisted in plaintext.
- Lookup is by `tokenHash`, so a database leak yields no usable tokens.
- `toPublicInvitation()` is the only serializer used by the API and has no
  `tokenHash` field, so the hash cannot reach a client. Password hashes, the JWT
  secret, and database credentials are likewise never returned.
- **Single-use**: acceptance claims the row with
  `updateMany({ where: { id, status: 'PENDING' } })` inside a transaction and
  aborts when `count === 0`. Two concurrent accepts cannot both succeed.
- **Time-limited**: `INVITATION_TTL_HOURS` (default 72), enforced at acceptance
  and in `deriveStatus()`.
- **Email-bound**: the invitation carries the email; a signed-in user whose
  account does not match gets `403 EMAIL_MISMATCH`.
- **Company-bound**: `startupId` is on the invitation row, so a token can only
  ever grant access to the company that issued it.
- **One live token per invitee**: creating or resending revokes prior `PENDING`
  invitations for the same `(startupId, email)`, so superseded links die
  immediately and cannot create a second membership.
- Raw tokens and URLs are returned by the API **only when `NODE_ENV !== 'production'`**
  (`exposeInvitationUrl`).

**Duplicate membership protection** — three layers: the
`@@unique([userId, startupId])` constraint; `ensureMembership()` checking first;
and `createInvitation()` rejecting an email that is already a member
(`409 ALREADY_MEMBER`).

**Atomicity** — user creation, membership creation, and the status transition run
in one `$transaction`, so the system cannot reach the state
"user created / membership missing / invitation still pending".

**Password handling** — invitee passwords are hashed with bcrypt (10 rounds) via
a `hashPassword` function injected by the route, so `invitationService` has no
dependency on the auth layer and no password ever reaches it in storable form.

## 13. Tests

`tests/membershipInvitations.test.ts`, registered in `npm test`. It creates its
own throwaway companies and users and deletes them in a `finally` block, so it
never mutates existing development data. It skips the integration sections with a
warning if the database is unreachable.

| Group | Covers |
|---|---|
| Token & role primitives | 256-bit entropy, unpredictability, hash determinism, hash ≠ token, `FOUNDER` not invitable, case-insensitive role validation, unknown role rejected, derived expiry, `tokenHash` absent from the public shape |
| Permission enforcement | `FOUNDER`/`ADMIN` may invite; `FINANCE`/`HR` get 403; unauthenticated gets 401 |
| Membership | Founder membership created; idempotent `ensureMembership`; unique constraint blocks duplicates; correct startup; owner flagged; **ownership fallback before backfill**; `isMemberOf` true for own company, false for another |
| Invitation creation | `PENDING` status, email normalized, role canonicalized, raw token issued, **only the hash persisted**, future expiry, invalid email/role/company rejected, listing is tenant-scoped |
| Preview | Returns company/role, flags `requiresAccount`, no `tokenHash`, bogus token rejected |
| New user | Password required; `User` + `Membership` created; role from invitation; exactly one `User` row for the email; invitation marked `ACCEPTED` with `acceptedAt` |
| Single use | An accepted token cannot be reused |
| Existing user | No duplicate `User`; user count unchanged; membership attached to the existing account; re-inviting a member rejected |
| Identity binding | Signed-in user cannot accept someone else's invitation |
| Revocation | Pending can be revoked; revoked cannot be accepted; cannot revoke twice |
| Expiry | Past-expiry reads `EXPIRED` and cannot be accepted |
| Resend | New token differs; fresh window; old invitation revoked; **old token dead**; new token works; exactly one membership results |
| Cross-company | A cannot revoke/resend B's invitation; membership listing confined to one company; B's invitee has no access to A |
| Atomicity | User + membership + status commit together; password stored hashed |

## 14. Remaining limitations

1. **People shows two lists.** "Company Accounts" (Membership) and "Active Team"
   (`TEAM_MEMBER` Memory) are not reconciled — a person can appear in both. See
   the transitional state in §10.
2. **`DELETE /api/team/:id` still operates on Memory only.** Removing a
   *membership* (revoking an employee's access) has no endpoint yet. The service
   layer is ready; the route is not. This is the natural next task.
3. **One company per user.** `resolveMembership()` takes the oldest active
   membership when no `startupId` is given. The schema already supports many
   memberships per user, but there is no company switcher and no request-scoped
   company selection.
4. **`attachMembershipRole` is mounted per-route**, not globally, so a route added
   later will fall back to `User.role` unless it opts in.
5. **No real email delivery.** `invitationMailer` logs the URL unless SMTP is
   configured; `nodemailer` is not installed. See below.
6. **`SUSPENDED` is modelled but unused.** No endpoint sets it yet.
7. **`Startup.ownerId` is still duplicated** by the founder's membership. Removing
   it would be a larger change and was explicitly out of scope.
8. **The Python FastAPI service is untouched** and remains effectively
   single-tenant (noted in `P0_SYSTEM_AUDIT.md`).
9. **`/api/auth/signup` still assigns `User.role`** from the legacy
   `['Founder','Executive','Investor','Admin']` list. Harmless, because membership
   role now wins wherever `attachMembershipRole` is mounted.
10. **A pre-existing, unrelated TypeScript error** remains at
    `backend/routes/api.ts` (`healthScore` missing on an object literal). It predates
    this task and was left alone.

### Enabling email later

No caller changes are required:

```bash
npm i nodemailer
```

```env
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="CatalystOS <no-reply@yourdomain>"
APP_BASE_URL=https://app.yourdomain.com
INVITATION_TTL_HOURS=72
```

`invitationMailer.sendInvitationEmail()` switches to SMTP as soon as `SMTP_HOST`,
`SMTP_USER` and `SMTP_PASS` are present. `nodemailer` is imported dynamically, so
the app runs with or without the package. The mailer never throws: a delivery
failure cannot roll back an invitation that was already persisted, and the result
is reported to the caller as `emailDelivered` / `deliveryChannel`.

---

## Files changed

**Added**
- `backend/services/membershipService.ts`
- `backend/services/invitationService.ts`
- `backend/services/invitationMailer.ts`
- `src/components/AcceptInvitation.tsx`
- `prisma/migrations/20261008000000_add_membership_and_invitation/migration.sql`
- `prisma/backfillMemberships.ts`
- `tests/membershipInvitations.test.ts`
- `docs/P1_TASK_8_MEMBERSHIP_INVITATIONS.md`

**Modified**
- `prisma/schema.prisma` — `Membership` + `Invitation` models; relations on `User`/`Startup`
- `backend/routes/api.ts` — membership/invitation routes; `attachMembershipRole`; membership-aware `/permissions/me`
- `backend/services/companyContextService.ts` — `getContextForUser` falls back to Membership
- `src/App.tsx` — invitation state/handlers; `/accept-invitation` route
- `src/components/PeopleDirectory.tsx` — Company Accounts, Invitations, Invite modal
- `src/types.ts` — `CompanyInvitation`, `CompanyMembership`
- `package.json` — test script includes the new suite
