/**
 * CatalystOS — P1 Task 8 test suite: Membership + Invitations.
 *
 * Covers membership creation/uniqueness, the full invitation lifecycle, token
 * security, existing-vs-new user acceptance, and cross-company isolation.
 *
 * Creates its own throwaway companies and users and removes them in a finally
 * block, so it never mutates pre-existing development data.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import {
  ensureMembership,
  resolveMembership,
  isMemberOf,
  getEffectiveRole,
  listMemberships
} from '../backend/services/membershipService';
import {
  createInvitation,
  acceptInvitation,
  revokeInvitation,
  resendInvitation,
  peekInvitation,
  listInvitations,
  validateInvitableRole,
  hashToken,
  generateToken,
  deriveStatus,
  toPublicInvitation,
  InvitationError,
  INVITABLE_ROLES
} from '../backend/services/invitationService';
import { requirePermission } from '../backend/services/permissionService';
import { Response } from 'express';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${title} - ${details || 'Assertion failed'}`);
    failed++;
  }
}

async function assertRejects(
  fn: () => Promise<any>,
  expectedCode: string,
  title: string
) {
  try {
    await fn();
    assert(false, title, 'Expected a rejection but the call succeeded');
  } catch (err: any) {
    const code = err instanceof InvitationError ? err.code : err?.code;
    assert(code === expectedCode, title, `Expected code ${expectedCode}, got ${code} (${err?.message})`);
  }
}

function mockResponse() {
  const res: any = {
    statusCode: 200,
    jsonBody: null,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.jsonBody = body; return this; }
  };
  return res as Response & { statusCode: number; jsonBody: any };
}

const stamp = Date.now();
const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

// Everything created by this run, for cleanup.
const createdUserIds: string[] = [];
const createdStartupIds: string[] = [];

async function makeCompany(label: string) {
  const owner = await prisma.user.create({
    data: {
      email: `t8_owner_${label}_${stamp}@test.catalyst`,
      name: `Owner ${label}`,
      role: 'Founder',
      passwordHash: await hashPassword('ownerpass123')
    }
  });
  createdUserIds.push(owner.id);

  const startup = await prisma.startup.create({
    data: {
      name: `T8 Co ${label} ${stamp}`,
      industry: 'Testing',
      description: 'Task 8 fixture company',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);

  return { owner, startup };
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('  P1 TASK 8 — MEMBERSHIP + INVITATIONS');
  console.log('========================================================================');

  // ── Pure unit tests (no database) ────────────────────────────────────────
  console.log('\n[1] Token & role primitives');

  const t1 = generateToken();
  const t2 = generateToken();
  assert(t1.length === 64 && /^[0-9a-f]+$/.test(t1), 'Token is 32 bytes of hex (256-bit)');
  assert(t1 !== t2, 'Tokens are unpredictable (two draws differ)');
  assert(hashToken(t1) === hashToken(t1), 'Token hashing is deterministic');
  assert(hashToken(t1) !== t1, 'Stored hash never equals the raw token');
  assert(hashToken(t1) !== hashToken(t2), 'Distinct tokens hash distinctly');

  assert(!INVITABLE_ROLES.includes('FOUNDER' as any), 'FOUNDER is not invitable');
  assert(validateInvitableRole('finance') === 'FINANCE', 'Role validation is case-insensitive');
  try {
    validateInvitableRole('SUPERADMIN');
    assert(false, 'Unknown role is rejected');
  } catch (err: any) {
    assert(err.code === 'INVALID_ROLE', 'Unknown role is rejected with INVALID_ROLE');
  }
  try {
    validateInvitableRole('FOUNDER');
    assert(false, 'FOUNDER cannot be assigned via invitation');
  } catch (err: any) {
    assert(err.code === 'INVALID_ROLE', 'FOUNDER cannot be assigned via invitation');
  }

  assert(
    deriveStatus({ status: 'PENDING', expiresAt: new Date(Date.now() - 1000) }) === 'EXPIRED',
    'A past-expiry PENDING invitation derives as EXPIRED'
  );
  assert(
    deriveStatus({ status: 'PENDING', expiresAt: new Date(Date.now() + 60000) }) === 'PENDING',
    'An unexpired PENDING invitation stays PENDING'
  );
  assert(
    !('tokenHash' in toPublicInvitation({
      id: 'i', email: 'a@b.c', role: 'HR', status: 'PENDING',
      expiresAt: new Date(Date.now() + 1000), tokenHash: 'SECRET',
      createdAt: new Date(), acceptedAt: null, invitedById: 'u'
    })),
    'Public invitation shape never includes tokenHash'
  );

  // ── Permission enforcement (Task 7 reuse) ────────────────────────────────
  console.log('\n[2] Invitation permission enforcement');

  function runGuard(role: string | undefined, action: any) {
    const res = mockResponse();
    let nexted = false;
    requirePermission(action)({ user: role ? { role } : undefined } as any, res, () => { nexted = true; });
    return { res, nexted };
  }

  assert(runGuard('FOUNDER', 'people:invite').nexted, 'FOUNDER may invite');
  assert(runGuard('ADMIN', 'people:invite').nexted, 'ADMIN may invite');
  const financeInvite = runGuard('FINANCE', 'people:invite');
  assert(!financeInvite.nexted && financeInvite.res.statusCode === 403, 'FINANCE gets 403 on invite');
  const hrInvite = runGuard('HR', 'people:invite');
  assert(!hrInvite.nexted && hrInvite.res.statusCode === 403, 'HR gets 403 on invite');
  const anonInvite = runGuard(undefined, 'people:invite');
  assert(!anonInvite.nexted && anonInvite.res.statusCode === 401, 'Unauthenticated gets 401 on invite');

  // ── Database-backed tests ────────────────────────────────────────────────
  let dbUp = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbUp = false;
  }

  if (!dbUp) {
    console.log('\n  ⚠ Database unreachable — skipping integration tests.');
  } else {
    const companyA = await makeCompany('A');
    const companyB = await makeCompany('B');

    // ── Membership ─────────────────────────────────────────────────────────
    console.log('\n[3] Membership');

    const founderMembership = await ensureMembership(
      companyA.owner.id, companyA.startup.id, 'FOUNDER'
    );
    assert(founderMembership.created, 'Founder membership is created');
    assert(founderMembership.membership.role === 'FOUNDER', 'Founder membership carries FOUNDER role');
    assert(
      founderMembership.membership.startupId === companyA.startup.id,
      'Membership belongs to the correct startup'
    );

    const repeat = await ensureMembership(companyA.owner.id, companyA.startup.id, 'FOUNDER');
    assert(!repeat.created, 'ensureMembership is idempotent (no duplicate created)');

    let duplicateBlocked = false;
    try {
      await (prisma as any).membership.create({
        data: { userId: companyA.owner.id, startupId: companyA.startup.id, role: 'ADMIN', status: 'ACTIVE' }
      });
    } catch {
      duplicateBlocked = true;
    }
    assert(duplicateBlocked, 'Unique (userId, startupId) constraint blocks duplicate membership');

    const resolvedA = await resolveMembership(companyA.owner.id);
    assert(resolvedA?.startupId === companyA.startup.id, 'resolveMembership finds the right company');
    assert(resolvedA?.role === 'FOUNDER', 'resolveMembership returns the membership role');
    assert(resolvedA?.isOwner === true, 'Owner is flagged as owner');
    assert(resolvedA?.viaOwnership === false, 'Resolution came from Membership, not ownership fallback');

    // Compatibility: company B's owner has NO membership row yet.
    const resolvedB = await resolveMembership(companyB.owner.id);
    assert(resolvedB?.startupId === companyB.startup.id, 'Owner without membership still resolves (ownerId fallback)');
    assert(resolvedB?.role === 'FOUNDER', 'Ownership fallback yields FOUNDER');
    assert(resolvedB?.viaOwnership === true, 'Ownership fallback is reported as viaOwnership');
    assert(
      await getEffectiveRole(companyB.owner.id) === 'FOUNDER',
      'Existing founder keeps full role before backfill (P0 compatibility)'
    );

    assert(await isMemberOf(companyA.owner.id, companyA.startup.id), 'Owner is a member of own company');
    assert(
      !(await isMemberOf(companyA.owner.id, companyB.startup.id)),
      'Owner of A is NOT a member of B'
    );

    // ── Invitation creation ────────────────────────────────────────────────
    console.log('\n[4] Invitation creation & validation');

    const newEmail = `t8_new_${stamp}@test.catalyst`;
    const created = await createInvitation({
      startupId: companyA.startup.id,
      email: newEmail.toUpperCase(),
      role: 'finance',
      invitedById: companyA.owner.id
    });
    assert(created.invitation.status === 'PENDING', 'New invitation is PENDING');
    assert(created.invitation.email === newEmail, 'Email is normalized to lowercase');
    assert(created.invitation.role === 'FINANCE', 'Role is normalized to canonical form');
    assert(created.rawToken.length === 64, 'A raw token is issued to the caller');
    assert(created.invitationUrl.includes(created.rawToken), 'Invitation URL carries the raw token');
    assert(!('tokenHash' in (created.invitation as any)), 'Created invitation exposes no tokenHash');

    const storedRow = await (prisma as any).invitation.findUnique({
      where: { id: created.invitation.id }
    });
    assert(storedRow.tokenHash === hashToken(created.rawToken), 'Only the hash is persisted');
    assert(storedRow.tokenHash !== created.rawToken, 'Raw token is not stored in the database');
    assert(new Date(storedRow.expiresAt).getTime() > Date.now(), 'Invitation has a future expiry');

    await assertRejects(
      () => createInvitation({
        startupId: companyA.startup.id, email: 'not-an-email',
        role: 'HR', invitedById: companyA.owner.id
      }),
      'INVALID_EMAIL',
      'Invalid email is rejected'
    );
    await assertRejects(
      () => createInvitation({
        startupId: companyA.startup.id, email: `x_${stamp}@test.catalyst`,
        role: 'NOT_A_ROLE', invitedById: companyA.owner.id
      }),
      'INVALID_ROLE',
      'Invalid role is rejected'
    );
    await assertRejects(
      () => createInvitation({
        startupId: 'no-such-startup', email: `y_${stamp}@test.catalyst`,
        role: 'HR', invitedById: companyA.owner.id
      }),
      'STARTUP_NOT_FOUND',
      'Invitation for a non-existent company is rejected'
    );

    const scopedList = await listInvitations(companyA.startup.id);
    assert(
      scopedList.every(i => true) && scopedList.some(i => i.id === created.invitation.id),
      'Invitation appears in its own company listing'
    );
    const bList = await listInvitations(companyB.startup.id);
    assert(
      !bList.some(i => i.id === created.invitation.id),
      'Company B listing does not contain Company A invitation (tenant scoping)'
    );

    // ── Peek ───────────────────────────────────────────────────────────────
    console.log('\n[5] Invitation preview');

    const peeked = await peekInvitation(created.rawToken);
    assert(peeked.email === newEmail, 'Peek returns the invitee email');
    assert(peeked.companyName === companyA.startup.name, 'Peek returns the company name');
    assert(peeked.requiresAccount === true, 'Peek flags that a new account is required');
    assert(!('tokenHash' in (peeked as any)), 'Peek exposes no tokenHash');
    await assertRejects(
      () => peekInvitation('deadbeef'),
      'INVALID_TOKEN',
      'Peek with a bogus token is rejected'
    );

    // ── New-user acceptance ────────────────────────────────────────────────
    console.log('\n[6] New user acceptance');

    await assertRejects(
      () => acceptInvitation({ rawToken: created.rawToken, hashPassword }),
      'PASSWORD_REQUIRED',
      'New invitee must supply a password'
    );

    const acceptedNew = await acceptInvitation({
      rawToken: created.rawToken,
      password: 'newpass123',
      name: 'Rahul Finance',
      hashPassword
    });
    assert(acceptedNew.createdUser, 'A new User account is created');
    assert(acceptedNew.role === 'FINANCE', 'Membership uses the invited role');
    assert(acceptedNew.startupId === companyA.startup.id, 'Membership points at the inviting company');
    createdUserIds.push(acceptedNew.userId);

    const newUserMembership = await resolveMembership(acceptedNew.userId);
    assert(newUserMembership?.role === 'FINANCE', 'Accepted member resolves as FINANCE');
    assert(
      newUserMembership?.startupId === companyA.startup.id,
      'Accepted member resolves into the right company'
    );
    assert(newUserMembership?.isOwner === false, 'Accepted member is not the owner');
    assert(
      await getEffectiveRole(acceptedNew.userId) === 'FINANCE',
      'Effective role comes from Membership, not User.role'
    );

    const usersWithEmail = await prisma.user.count({ where: { email: newEmail } });
    assert(usersWithEmail === 1, 'Exactly one User row exists for the invited email');

    const acceptedRow = await (prisma as any).invitation.findUnique({
      where: { id: created.invitation.id }
    });
    assert(acceptedRow.status === 'ACCEPTED', 'Invitation is marked ACCEPTED');
    assert(acceptedRow.acceptedAt !== null, 'acceptedAt is recorded');

    // ── Single use ─────────────────────────────────────────────────────────
    console.log('\n[7] Single-use enforcement');

    await assertRejects(
      () => acceptInvitation({ rawToken: created.rawToken, password: 'newpass123', hashPassword }),
      'ALREADY_ACCEPTED',
      'An accepted token cannot be reused'
    );

    // ── Existing-user acceptance ───────────────────────────────────────────
    console.log('\n[8] Existing user acceptance');

    const existingUser = await prisma.user.create({
      data: {
        email: `t8_existing_${stamp}@test.catalyst`,
        name: 'Existing Person',
        role: 'Founder',
        passwordHash: await hashPassword('existingpass123')
      }
    });
    createdUserIds.push(existingUser.id);
    const userCountBefore = await prisma.user.count();

    const inviteExisting = await createInvitation({
      startupId: companyA.startup.id,
      email: existingUser.email,
      role: 'HR',
      invitedById: companyA.owner.id
    });
    const peekExisting = await peekInvitation(inviteExisting.rawToken);
    assert(peekExisting.requiresAccount === false, 'Peek knows the invitee already has an account');

    const acceptedExisting = await acceptInvitation({
      rawToken: inviteExisting.rawToken,
      authenticatedUserId: existingUser.id,
      hashPassword
    });
    assert(!acceptedExisting.createdUser, 'No new User is created for an existing account');
    assert(acceptedExisting.userId === existingUser.id, 'Membership attaches to the existing User');
    assert(
      await prisma.user.count() === userCountBefore,
      'User count is unchanged (no duplicate account)'
    );
    assert(
      await isMemberOf(existingUser.id, companyA.startup.id),
      'Existing user is now a member of the company'
    );

    // Already a member -> cannot be re-invited.
    await assertRejects(
      () => createInvitation({
        startupId: companyA.startup.id, email: existingUser.email,
        role: 'HR', invitedById: companyA.owner.id
      }),
      'ALREADY_MEMBER',
      'Re-inviting an existing member is rejected'
    );

    // ── Identity binding ───────────────────────────────────────────────────
    console.log('\n[9] Identity binding');

    const mismatchInvite = await createInvitation({
      startupId: companyA.startup.id,
      email: `t8_other_${stamp}@test.catalyst`,
      role: 'GROWTH',
      invitedById: companyA.owner.id
    });
    await assertRejects(
      () => acceptInvitation({
        rawToken: mismatchInvite.rawToken,
        authenticatedUserId: existingUser.id,
        hashPassword
      }),
      'EMAIL_MISMATCH',
      'A signed-in user cannot accept an invitation addressed to someone else'
    );

    // ── Revocation ─────────────────────────────────────────────────────────
    console.log('\n[10] Revocation');

    const revoked = await revokeInvitation(companyA.startup.id, mismatchInvite.invitation.id);
    assert(revoked.status === 'REVOKED', 'Pending invitation can be revoked');
    await assertRejects(
      () => acceptInvitation({
        rawToken: mismatchInvite.rawToken, password: 'whatever123', hashPassword
      }),
      'REVOKED',
      'A revoked invitation cannot be accepted'
    );
    await assertRejects(
      () => revokeInvitation(companyA.startup.id, mismatchInvite.invitation.id),
      'NOT_PENDING',
      'A revoked invitation cannot be revoked twice'
    );

    // ── Expiry ─────────────────────────────────────────────────────────────
    console.log('\n[11] Expiry');

    const expiring = await createInvitation({
      startupId: companyA.startup.id,
      email: `t8_expire_${stamp}@test.catalyst`,
      role: 'OPERATIONS',
      invitedById: companyA.owner.id
    });
    await (prisma as any).invitation.update({
      where: { id: expiring.invitation.id },
      data: { expiresAt: new Date(Date.now() - 60_000) }
    });
    const expiredPeek = await peekInvitation(expiring.rawToken);
    assert(expiredPeek.status === 'EXPIRED', 'A past-expiry invitation reads as EXPIRED');
    await assertRejects(
      () => acceptInvitation({
        rawToken: expiring.rawToken, password: 'whatever123', hashPassword
      }),
      'EXPIRED',
      'An expired invitation cannot be accepted'
    );

    // ── Resend supersedes ──────────────────────────────────────────────────
    console.log('\n[12] Resend');

    const original = await createInvitation({
      startupId: companyA.startup.id,
      email: `t8_resend_${stamp}@test.catalyst`,
      role: 'GROWTH',
      invitedById: companyA.owner.id
    });
    const resent = await resendInvitation(
      companyA.startup.id, original.invitation.id, companyA.owner.id
    );
    assert(resent.rawToken !== original.rawToken, 'Resend issues a different token');
    assert(
      new Date(resent.invitation.expiresAt).getTime() >= new Date(original.invitation.expiresAt).getTime(),
      'Resend opens a fresh expiration window'
    );

    const oldRow = await (prisma as any).invitation.findUnique({
      where: { id: original.invitation.id }
    });
    assert(oldRow.status === 'REVOKED', 'The superseded invitation is revoked');
    await assertRejects(
      () => acceptInvitation({
        rawToken: original.rawToken, password: 'whatever123', hashPassword
      }),
      'REVOKED',
      'The old token is dead after a resend (no duplicate membership path)'
    );

    const acceptedResend = await acceptInvitation({
      rawToken: resent.rawToken,
      password: 'resendpass123',
      hashPassword
    });
    createdUserIds.push(acceptedResend.userId);
    assert(acceptedResend.role === 'GROWTH', 'The new token still works and grants the right role');

    const resendMemberships = await (prisma as any).membership.count({
      where: { userId: acceptedResend.userId, startupId: companyA.startup.id }
    });
    assert(resendMemberships === 1, 'Resend cannot produce two memberships for one person');

    // ── Cross-company isolation ────────────────────────────────────────────
    console.log('\n[13] Cross-company isolation');

    const bInvite = await createInvitation({
      startupId: companyB.startup.id,
      email: `t8_bco_${stamp}@test.catalyst`,
      role: 'HR',
      invitedById: companyB.owner.id
    });

    await assertRejects(
      () => revokeInvitation(companyA.startup.id, bInvite.invitation.id),
      'NOT_FOUND',
      'Company A cannot revoke a Company B invitation'
    );
    await assertRejects(
      () => resendInvitation(companyA.startup.id, bInvite.invitation.id, companyA.owner.id),
      'NOT_FOUND',
      'Company A cannot resend a Company B invitation'
    );

    const aMembers = await listMemberships(companyA.startup.id);
    assert(
      aMembers.every((m: any) => m.startupId === companyA.startup.id),
      'Membership listing is confined to one company'
    );
    assert(
      !aMembers.some((m: any) => m.userId === companyB.owner.id),
      'Company B owner does not appear in Company A members'
    );

    // Accepting B's invitation must not grant access to A.
    const bAccepted = await acceptInvitation({
      rawToken: bInvite.rawToken,
      password: 'bcopass123',
      hashPassword
    });
    createdUserIds.push(bAccepted.userId);
    assert(
      await isMemberOf(bAccepted.userId, companyB.startup.id),
      'B invitee is a member of Company B'
    );
    assert(
      !(await isMemberOf(bAccepted.userId, companyA.startup.id)),
      'B invitee has no access to Company A'
    );

    // ── Atomicity ──────────────────────────────────────────────────────────
    console.log('\n[14] Atomicity');

    const atomicInvite = await createInvitation({
      startupId: companyA.startup.id,
      email: `t8_atomic_${stamp}@test.catalyst`,
      role: 'OPERATIONS',
      invitedById: companyA.owner.id
    });
    const atomicAccepted = await acceptInvitation({
      rawToken: atomicInvite.rawToken,
      password: 'atomicpass123',
      hashPassword
    });
    createdUserIds.push(atomicAccepted.userId);

    const [atomicUser, atomicMembership, atomicRow] = await Promise.all([
      prisma.user.findUnique({ where: { id: atomicAccepted.userId } }),
      (prisma as any).membership.findUnique({
        where: {
          userId_startupId: {
            userId: atomicAccepted.userId,
            startupId: companyA.startup.id
          }
        }
      }),
      (prisma as any).invitation.findUnique({ where: { id: atomicInvite.invitation.id } })
    ]);
    assert(
      Boolean(atomicUser && atomicMembership && atomicRow.status === 'ACCEPTED'),
      'Acceptance commits user + membership + status together'
    );
    assert(
      atomicUser?.passwordHash !== 'atomicpass123' && Boolean(atomicUser?.passwordHash),
      'The invitee password is stored hashed, never in plaintext'
    );
  }

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exitCode = 1;
}

async function cleanup() {
  try {
    // Invitations and memberships cascade from Startup/User deletion.
    if (createdStartupIds.length) {
      await (prisma as any).invitation.deleteMany({
        where: { startupId: { in: createdStartupIds } }
      });
      await (prisma as any).membership.deleteMany({
        where: { startupId: { in: createdStartupIds } }
      });
      await prisma.startup.deleteMany({ where: { id: { in: createdStartupIds } } });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  } catch (err: any) {
    console.warn('  ⚠ Cleanup warning:', err.message);
  }
}

runTests()
  .catch(err => {
    console.error('Test suite crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
