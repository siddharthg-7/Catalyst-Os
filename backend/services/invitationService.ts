/**
 * P1 Task 8 — Invitations.
 *
 * Lifecycle: PENDING -> ACCEPTED | EXPIRED | REVOKED (terminal states are final).
 *
 * Token handling: a 32-byte random token is generated, SHA-256 hashed, and only
 * the hash is persisted. The raw token leaves this module exactly once, inside
 * the invitation URL handed to the mailer. It is never stored in plaintext and
 * never returned by any API in production.
 *
 * Roles are validated against permissionService.ROLES — this module does not
 * define a second role system.
 */
import crypto from 'crypto';
import { prisma, safeDbQuery } from './dbService';
import { ROLES, type Role } from './permissionService';
import { ensureMembership } from './membershipService';
import { sendInvitationEmail, type DeliveryResult } from './invitationMailer';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/** FOUNDER is not invitable: it belongs to the venture owner. */
export const INVITABLE_ROLES: Role[] = ROLES.filter(r => r !== 'FOUNDER') as Role[];

const DEFAULT_TTL_HOURS = Number(process.env.INVITATION_TTL_HOURS || 72);

export class InvitationError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
    this.name = 'InvitationError';
  }
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validates a client-supplied role. The raw value is never trusted. */
export function validateInvitableRole(role: string | undefined | null): Role {
  const candidate = (role || '').trim().toUpperCase();
  if (!INVITABLE_ROLES.includes(candidate as Role)) {
    throw new InvitationError(
      400,
      `Role must be one of [${INVITABLE_ROLES.join(', ')}].`,
      'INVALID_ROLE'
    );
  }
  return candidate as Role;
}

export function buildInvitationUrl(rawToken: string): string {
  const base = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/accept-invitation?token=${rawToken}`;
}

/** Public shape — deliberately excludes tokenHash. */
export function toPublicInvitation(invitation: any) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: deriveStatus(invitation),
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
    invitedById: invitation.invitedById
  };
}

/** PENDING invitations past their expiry read as EXPIRED without needing a job. */
export function deriveStatus(invitation: any): InvitationStatus {
  if (invitation.status === 'PENDING' && new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  return invitation.status as InvitationStatus;
}

export interface CreateInvitationInput {
  startupId: string;
  email: string;
  role: string;
  invitedById: string;
  ttlHours?: number;
}

export interface CreatedInvitation {
  invitation: ReturnType<typeof toPublicInvitation>;
  /** Raw token — for the mailer and development responses only. */
  rawToken: string;
  invitationUrl: string;
  delivery: DeliveryResult;
}

/**
 * Creates a PENDING invitation, superseding any existing PENDING invitation for
 * the same (startup, email) so at most one token is ever valid per invitee.
 */
export async function createInvitation(input: CreateInvitationInput): Promise<CreatedInvitation> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new InvitationError(400, 'A valid email address is required.', 'INVALID_EMAIL');
  }
  const role = validateInvitableRole(input.role);

  const startup = await safeDbQuery(() =>
    prisma.startup.findUnique({
      where: { id: input.startupId },
      select: { id: true, name: true }
    })
  ) as any;
  if (!startup) {
    throw new InvitationError(404, 'Company not found.', 'STARTUP_NOT_FOUND');
  }

  // Already a member of THIS company? Nothing to invite.
  const existingUser = await safeDbQuery(() =>
    prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })
  ) as any;
  if (existingUser) {
    const existingMembership = await safeDbQuery(() =>
      (prisma as any).membership.findUnique({
        where: { userId_startupId: { userId: existingUser.id, startupId: startup.id } }
      })
    ) as any;
    if (existingMembership) {
      throw new InvitationError(
        409,
        'That person is already a member of this company.',
        'ALREADY_MEMBER'
      );
    }
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const ttlHours = input.ttlHours && input.ttlHours > 0 ? input.ttlHours : DEFAULT_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const invitation = await (prisma as any).$transaction(async (tx: any) => {
    // Supersede prior pending tokens for this invitee in this company.
    await tx.invitation.updateMany({
      where: { startupId: startup.id, email, status: 'PENDING' },
      data: { status: 'REVOKED' }
    });

    return tx.invitation.create({
      data: {
        startupId: startup.id,
        email,
        role,
        tokenHash,
        status: 'PENDING',
        expiresAt,
        invitedById: input.invitedById
      }
    });
  });

  const inviter = await safeDbQuery(() =>
    prisma.user.findUnique({
      where: { id: input.invitedById },
      select: { name: true, email: true }
    })
  ).catch(() => null) as any;

  const invitationUrl = buildInvitationUrl(rawToken);
  const delivery = await sendInvitationEmail({
    to: email,
    companyName: startup.name,
    role,
    invitedByName: inviter?.name || inviter?.email || 'A teammate',
    invitationUrl,
    expiresAt
  });

  return {
    invitation: toPublicInvitation(invitation),
    rawToken,
    invitationUrl,
    delivery
  };
}

/** All invitations for one company. The caller must already have verified tenancy. */
export async function listInvitations(startupId: string) {
  const rows = await safeDbQuery(() =>
    (prisma as any).invitation.findMany({
      where: { startupId },
      orderBy: { createdAt: 'desc' }
    })
  ) as any[];
  return (rows || []).map(toPublicInvitation);
}

/**
 * Revokes a PENDING invitation. Tenant-scoped: startupId is part of the WHERE
 * clause, so one company can never revoke another company's invitation.
 */
export async function revokeInvitation(startupId: string, invitationId: string) {
  const invitation = await safeDbQuery(() =>
    (prisma as any).invitation.findFirst({ where: { id: invitationId, startupId } })
  ) as any;
  if (!invitation) {
    throw new InvitationError(404, 'Invitation not found.', 'NOT_FOUND');
  }
  if (invitation.status !== 'PENDING') {
    throw new InvitationError(
      409,
      `Only pending invitations can be revoked (current status: ${deriveStatus(invitation)}).`,
      'NOT_PENDING'
    );
  }
  const updated = await (prisma as any).invitation.update({
    where: { id: invitation.id },
    data: { status: 'REVOKED' }
  });
  return toPublicInvitation(updated);
}

/**
 * Issues a fresh token for an existing invitee, superseding the old one via
 * createInvitation's updateMany. Tenant-scoped.
 */
export async function resendInvitation(
  startupId: string,
  invitationId: string,
  invitedById: string
): Promise<CreatedInvitation> {
  const invitation = await safeDbQuery(() =>
    (prisma as any).invitation.findFirst({ where: { id: invitationId, startupId } })
  ) as any;
  if (!invitation) {
    throw new InvitationError(404, 'Invitation not found.', 'NOT_FOUND');
  }
  if (invitation.status === 'ACCEPTED') {
    throw new InvitationError(409, 'That invitation has already been accepted.', 'ALREADY_ACCEPTED');
  }
  return createInvitation({
    startupId,
    email: invitation.email,
    role: invitation.role,
    invitedById
  });
}

/**
 * Looks up an invitation by raw token for the acceptance screen. Returns the
 * company and role only — never the hash, never the invitee's account details.
 */
export async function peekInvitation(rawToken: string) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new InvitationError(400, 'An invitation token is required.', 'MISSING_TOKEN');
  }
  const invitation = await safeDbQuery(() =>
    (prisma as any).invitation.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { startup: { select: { id: true, name: true } } }
    })
  ) as any;

  if (!invitation) {
    throw new InvitationError(404, 'This invitation link is not valid.', 'INVALID_TOKEN');
  }

  const status = deriveStatus(invitation);
  const existingUser = await safeDbQuery(() =>
    prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } })
  ).catch(() => null) as any;

  return {
    email: invitation.email,
    role: invitation.role,
    status,
    companyName: invitation.startup?.name || 'CatalystOS',
    expiresAt: invitation.expiresAt,
    /** Tells the UI whether to ask for a new password or just a sign-in. */
    requiresAccount: !existingUser
  };
}

export interface AcceptResult {
  userId: string;
  startupId: string;
  role: Role;
  createdUser: boolean;
  companyName: string;
}

/**
 * Validates a token and, atomically, creates the User (if new), creates the
 * Membership, and marks the invitation ACCEPTED. All three happen in one
 * transaction so the system can never end up with a user that has no membership.
 *
 * `authenticatedUserId` is supplied when an already signed-in user accepts; the
 * invitation email must then match their account. `password` is supplied when
 * the invitee has no account yet.
 */
export async function acceptInvitation(opts: {
  rawToken: string;
  password?: string;
  name?: string;
  authenticatedUserId?: string;
  /** Injected by the route so this module does not depend on the auth layer. */
  hashPassword: (plain: string) => Promise<string>;
}): Promise<AcceptResult> {
  const { rawToken, password, name, authenticatedUserId, hashPassword } = opts;

  if (!rawToken || typeof rawToken !== 'string') {
    throw new InvitationError(400, 'An invitation token is required.', 'MISSING_TOKEN');
  }

  const tokenHash = hashToken(rawToken);

  const invitation = await safeDbQuery(() =>
    (prisma as any).invitation.findUnique({
      where: { tokenHash },
      include: { startup: { select: { id: true, name: true } } }
    })
  ) as any;

  // 1. Token is valid
  if (!invitation) {
    throw new InvitationError(404, 'This invitation link is not valid.', 'INVALID_TOKEN');
  }

  // 2/3/4. Not expired, not already used, not revoked
  const status = deriveStatus(invitation);
  if (status === 'ACCEPTED') {
    throw new InvitationError(409, 'This invitation has already been used.', 'ALREADY_ACCEPTED');
  }
  if (status === 'REVOKED') {
    throw new InvitationError(409, 'This invitation has been revoked.', 'REVOKED');
  }
  if (status === 'EXPIRED') {
    throw new InvitationError(410, 'This invitation has expired. Ask for a new one.', 'EXPIRED');
  }

  // 6. Startup still exists
  if (!invitation.startup) {
    throw new InvitationError(404, 'The company for this invitation no longer exists.', 'STARTUP_GONE');
  }

  // 8. Role is still valid
  const role = validateInvitableRole(invitation.role);

  const existingUser = await safeDbQuery(() =>
    prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, name: true }
    })
  ) as any;

  // 5. Invitee identity matches the invitation
  if (authenticatedUserId && (!existingUser || authenticatedUserId !== existingUser.id)) {
    throw new InvitationError(
      403,
      'This invitation was issued to a different email address.',
      'EMAIL_MISMATCH'
    );
  }

  let passwordHash: string | null = null;
  if (!existingUser) {
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new InvitationError(
        400,
        'A password of at least 6 characters is required to create your account.',
        'PASSWORD_REQUIRED'
      );
    }
    passwordHash = await hashPassword(password);
  }

  const result = await (prisma as any).$transaction(async (tx: any) => {
    // Claim the invitation by moving PENDING -> ACCEPTED. The updateMany count
    // is the guard: two concurrent accepts cannot both win.
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, status: 'PENDING' },
      data: { status: 'ACCEPTED', acceptedAt: new Date() }
    });
    if (claimed.count === 0) {
      throw new InvitationError(409, 'This invitation has already been used.', 'ALREADY_ACCEPTED');
    }

    let userId: string;
    let createdUser = false;

    if (existingUser) {
      // 10. Existing user: reuse the account, never duplicate it.
      userId = existingUser.id;
    } else {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          name: (name || '').trim() || invitation.email.split('@')[0],
          role,
          passwordHash
        }
      });
      userId = created.id;
      createdUser = true;
    }

    // 7. Membership must not already exist; the unique constraint also enforces this.
    await ensureMembership(userId, invitation.startupId, role, tx);

    return { userId, createdUser };
  });

  return {
    userId: result.userId,
    startupId: invitation.startupId,
    role,
    createdUser: result.createdUser,
    companyName: invitation.startup.name
  };
}
