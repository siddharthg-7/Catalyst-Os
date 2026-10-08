/**
 * P1 Task 8 — Membership resolution.
 *
 * Membership is the authoritative User <-> Startup relationship. `Startup.ownerId`
 * is preserved for backwards compatibility, so every resolver here checks
 * Membership first and then falls back to ownership. That fallback is what keeps
 * all existing P0 founder behaviour working on databases where the backfill
 * (prisma/backfillMemberships.ts) has not run yet.
 *
 * Deliberately NOT a rewrite of authorization: this module only resolves
 * "which company, and in what role". Capabilities still come from permissionService.
 */
import { prisma, safeDbQuery } from './dbService';
import { normalizeRole, getPermissions, type Role, type Permissions } from './permissionService';

export type MembershipStatus = 'ACTIVE' | 'SUSPENDED';

export interface ResolvedMembership {
  startupId: string;
  role: Role;
  status: MembershipStatus;
  /** True when resolved from Startup.ownerId rather than a Membership row. */
  viaOwnership: boolean;
  isOwner: boolean;
}

function dbReady(): boolean {
  return Boolean(prisma);
}

/**
 * Resolves the company the user acts within, Membership first, ownership second.
 * Returns null when the user belongs to no company.
 */
export async function resolveMembership(
  userId: string,
  startupId?: string
): Promise<ResolvedMembership | null> {
  if (!userId || !dbReady()) return null;

  try {
    const membership: any = await safeDbQuery(() =>
      (prisma as any).membership.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          ...(startupId ? { startupId } : {})
        },
        include: { startup: { select: { id: true, ownerId: true } } },
        orderBy: { createdAt: 'asc' }
      })
    );

    if (membership) {
      return {
        startupId: membership.startupId,
        role: normalizeRole(membership.role),
        status: membership.status as MembershipStatus,
        viaOwnership: false,
        isOwner: membership.startup?.ownerId === userId
      };
    }

    // Compatibility fallback: a founder whose membership has not been backfilled.
    const owned: any = await safeDbQuery(() =>
      prisma.startup.findFirst({
        where: { ownerId: userId, ...(startupId ? { id: startupId } : {}) },
        select: { id: true }
      })
    );

    if (owned) {
      return {
        startupId: owned.id,
        role: 'FOUNDER',
        status: 'ACTIVE',
        viaOwnership: true,
        isOwner: true
      };
    }
  } catch (err: any) {
    console.warn('[membershipService] resolveMembership note:', err.message);
  }

  return null;
}

/** The startup id the user acts within, or null. */
export async function getActiveStartupId(userId: string): Promise<string | null> {
  const membership = await resolveMembership(userId);
  return membership?.startupId ?? null;
}

/**
 * The role that should drive permissions for this user in this company.
 * Falls back to the User.role column only when no company can be resolved,
 * which preserves pre-Task-8 behaviour for users without a startup.
 */
export async function getEffectiveRole(
  userId: string,
  fallbackRole?: string | null,
  startupId?: string
): Promise<Role> {
  const membership = await resolveMembership(userId, startupId);
  if (membership) return membership.role;
  return normalizeRole(fallbackRole);
}

/** Effective permissions for this user in this company. */
export async function getEffectivePermissions(
  userId: string,
  fallbackRole?: string | null,
  startupId?: string
): Promise<Permissions> {
  return getPermissions(await getEffectiveRole(userId, fallbackRole, startupId));
}

/**
 * Tenant guard. True only when the user has an active membership in — or owns —
 * the given startup. Every cross-company check should route through this.
 */
export async function isMemberOf(userId: string, startupId: string): Promise<boolean> {
  if (!userId || !startupId) return false;
  const membership = await resolveMembership(userId, startupId);
  return membership?.startupId === startupId;
}

/**
 * Creates a membership if absent, idempotently. The unique constraint on
 * (userId, startupId) is the real guarantee; this just avoids the error path.
 * Accepts an optional transaction client so acceptance stays atomic.
 */
export async function ensureMembership(
  userId: string,
  startupId: string,
  role: Role,
  client: any = prisma
): Promise<{ created: boolean; membership: any }> {
  const existing = await client.membership.findUnique({
    where: { userId_startupId: { userId, startupId } }
  });
  if (existing) return { created: false, membership: existing };

  const membership = await client.membership.create({
    data: { userId, startupId, role, status: 'ACTIVE' }
  });
  return { created: true, membership };
}

/** All active members of a company, for the People page. */
export async function listMemberships(startupId: string): Promise<any[]> {
  if (!startupId || !dbReady()) return [];
  try {
    return await safeDbQuery(() =>
      (prisma as any).membership.findMany({
        where: { startupId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' }
      })
    );
  } catch (err: any) {
    console.warn('[membershipService] listMemberships note:', err.message);
    return [];
  }
}

/**
 * Express middleware. Replaces req.user.role with the role from the caller's
 * Membership, so the synchronous requirePermission() checks downstream operate
 * on the membership role rather than the User.role column.
 *
 * Deliberately narrow: this is the seam that makes Membership authoritative for
 * authorization without rewriting the permission middleware. Mount it directly
 * after authenticateJWT on routes where role differentiation matters. If no
 * membership resolves, req.user.role is left untouched, preserving pre-Task-8
 * behaviour.
 */
export async function attachMembershipRole(req: any, _res: any, next: any) {
  try {
    if (req.user?.id) {
      const membership = await resolveMembership(req.user.id);
      if (membership) {
        req.user.role = membership.role;
        req.membership = membership;
      }
    }
  } catch (err: any) {
    console.warn('[membershipService] attachMembershipRole note:', err.message);
  }
  next();
}
