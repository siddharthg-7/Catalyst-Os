# CURRENT_AUTH_FLOW.md — CatalystOS Authentication & Onboarding Audit

## 1. Executive Summary

This document details the exact end-to-end execution flow of user registration, authentication, startup association, onboarding state handling, middleware verification, and workspace entry in CatalystOS as audited from the live codebase.

---

## 2. Authentication Flow Diagram

```
Signup / Signin (AuthScreen.tsx / AuthContext.tsx)
       ↓
User Creation (POST /api/auth/signup -> Prisma user.create)
       ↓
[CURRENT BUG] Auto-startup dummy creation (api.ts lines 128-176)
       ↓
Session Token Generation (JWT signed with JWT_SECRET, 7d expiry)
       ↓
Stored in localStorage ('catalystos_token', 'catalystos_user')
       ↓
Middleware Verification (neonAuthMiddleware.ts / authenticateJWT)
       ↓
Frontend Route Guard (App.tsx /dashboard/*)
       ↓
Dashboard Entry (SaaSDashboard.tsx / AgentWorkspace.tsx)
```

---

## 3. Step-by-Step Flow Breakdown

### A. Signup
1. **Frontend Initiation**: In [src/components/AuthScreen.tsx](file:///c:/project-self-1/catalyst-os/src/components/AuthScreen.tsx), the user submits email, password, full name, and selected role (`'Founder' | 'Executive' | 'Investor' | 'Admin'`).
2. **Context Dispatch**: [AuthContext.signup()](file:///c:/project-self-1/catalyst-os/src/context/AuthContext.tsx#L139-L173) sends `POST /api/auth/signup`.
3. **Password Hashing**: [backend/routes/api.ts](file:///c:/project-self-1/catalyst-os/backend/routes/api.ts#L118) hashes the password using `bcrypt.hashSync(password, 10)`.
4. **User Record Creation**: Prisma creates the user row in PostgreSQL with `email`, `name`, `role`, and `passwordHash`.

### B. Startup Creation & Agent Initialization (Current Behavior vs. Intended Flow)
1. **Current Code Behavior**:
   - Immediately inside `POST /api/auth/signup` ([api.ts:L128-L173](file:///c:/project-self-1/catalyst-os/backend/routes/api.ts#L128-L173)), the backend automatically invokes `workspaceService.saveOnboardingData()` with synthetic dummy data:
     - Startup Name: `${cleanName}'s Venture`
     - Industry: `Technology / SaaS`
     - Description: `Autonomous executive intelligence and SaaS operations platform.`
     - Cash Balance: `$250,000`, Burn Rate: `$15,000/mo`
     - Target ICP: `Fast-growing software startups`
   - This automatically creates:
     - A `Startup` row in PostgreSQL.
     - A `startup_contexts` record.
     - 8 default `ExecutiveAgent` rows (`Atlas`, `Aura`, `Echo`, `Vector`, `Nexus`, `Helix`, `Apex`, `Sentry`).
     - Default business context in `Memory` table.
     - An initial living profile document (`[Company Profile] ...`) indexed into vector RAG.
   - The signup response returns `{ success: true, token, user, onboarded: true, startup }`.
2. **Impact**: Because `onboarded` is returned as `true` with synthetic data, fresh founders **never** get routed to founder onboarding to enter their real startup data!

### C. Session & JWT
1. **Token Generation**: On both `POST /api/auth/signup` and `POST /api/auth/signin`, the backend creates a signed JWT using `jsonwebtoken`:
   ```ts
   jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
   ```
2. **Client Persistence**: [AuthContext.tsx](file:///c:/project-self-1/catalyst-os/src/context/AuthContext.tsx#L122-L130) persists:
   - `catalystos_token` (JWT string)
   - `catalystos_user` (JSON object)
   - `catalystos_onboarding_completed_${user.id}` (string flag)
   - `catalystos_startup_${user.id}` (startup snapshot)
3. **Session Verification**: On page refresh, `AuthContext` calls `GET /api/auth/me` with `Authorization: Bearer <token>` to revalidate the user session.

### D. Middleware Authorization
1. **`authenticateJWT`** ([backend/services/neonAuthMiddleware.ts](file:///c:/project-self-1/catalyst-os/backend/services/neonAuthMiddleware.ts#L43-L103)):
   - Checks `req.headers.authorization`.
   - If missing, or contains `demo`/`mock`, or if validation fails in development, it assigns a fallback demo user (`usr_founder_demo`, `founder@founder.os`, `Founder`).
   - If present, verifies JWT signature using `JWT_SECRET`.
   - If native JWT verification fails, attempts Neon Auth JWKS verification via Ed25519.
   - Populates `req.user`.
   - Upserts the user record into the database via non-blocking `ensureUserInDatabase()`.
2. **`requireRole`** ([backend/services/neonAuthMiddleware.ts:L109-L130](file:///c:/project-self-1/catalyst-os/backend/services/neonAuthMiddleware.ts#L109-L130)):
   - **Critical finding**: Current implementation does:
     ```ts
     if (!allowedRoles.includes(req.user.role)) {
       req.user.role = 'Founder';
     }
     next();
     ```
     Instead of returning HTTP 403 Forbidden, it silently promotes the unauthorized user to `'Founder'` and calls `next()`.

### E. Frontend Routing & Dashboard Entry
1. **`AuthScreen.tsx`**:
   - In `handleAuthSubmit`, after successful signin or signup:
     ```ts
     navigate('/dashboard');
     ```
     It unconditionally routes directly to `/dashboard`, bypassing onboarding.
2. **`App.tsx` Route Guard**:
   - `/dashboard/*` checks:
     ```tsx
     loading || isCheckingStartup ? <Spinner /> : !user ? <Navigate to="/auth" replace /> : renderDashboard()
     ```
     It **does not check** whether `onboardingCompleted` is true or false.
   - Even if `onboardingCompleted === false`, navigating to `/dashboard` immediately renders the dashboard.

---

## 4. Key Architectural Discoveries

| Question | Current System Reality |
|---|---|
| **Where does user identity come from?** | Neon PostgreSQL `User` table (or Neon Auth JWKS token). Identified by UUID `id`, `email`, and `name`. Stored in JWT `sub`. |
| **Where does Startup/company identity come from?** | PostgreSQL `Startup` table where `ownerId = user.id`. Linked to `startup_contexts`, `ExecutiveAgent`, `Memory`, `StartupDocument`, `Command`, `Plan`. |
| **How is Founder/Admin determined?** | Stored on `User.role` field in PostgreSQL (`'Founder' \| 'Executive' \| 'Investor' \| 'Admin'`). Encoded in the signed JWT. |
| **What happens if onboarding isn't complete?** | Previously: User never saw onboarding because signup automatically created dummy data and marked `onboarded: true`. Furthermore, `/dashboard/*` never checked `onboardingCompleted`. |
| **Where is authorization enforced?** | `backend/services/neonAuthMiddleware.ts` via `authenticateJWT` and `requireRole`. Also in frontend UI where action buttons show toast errors for `Executive` role. |
| **Which APIs currently require Founder/Admin?** | 1. `POST /api/startup` (Startup profile/parameters update)<br>2. `POST /api/approvals/:id/review` (Approving/rejecting deliverables) |
| **Which frontend routes are protected?** | Protected behind `!user` check: `/dashboard/*`<br>Protected behind auth + not loading: `/onboarding`<br>Redirected to `/dashboard` when authenticated: `/auth` |

---

## 5. Root Causes of Missing Founder Onboarding

1. **Premature Auto-Creation in Signup**: `backend/routes/api.ts` lines 128-173 auto-created a dummy startup on user registration and returned `onboarded: true`.
2. **Auto-Creation in `GET /api/startup`**: `backend/routes/api.ts` lines 487-506 auto-created a dummy startup if none existed and returned `onboarded: true`.
3. **Blind Navigation in `AuthScreen.tsx`**: `handleAuthSubmit` called `navigate('/dashboard')` directly on signup and signin without checking onboarding status.
4. **Missing Route Guard in `App.tsx`**: `/dashboard/*` did not redirect un-onboarded founders to `/onboarding`.
5. **Hardcoded Financial Assumptions in `AuthScreen` Onboarding Form**: When completing onboarding in `AuthScreen.tsx`, cash and burn were hardcoded (`cashBalance: 250000`, `monthlyBurn: existingTeamSize * 8000`) rather than collected from the founder.
