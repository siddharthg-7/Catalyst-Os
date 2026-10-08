/**
 * CatalystOS — P1 Task 9 test suite: Membership removal + People reconciliation.
 *
 * Covers removal/suspension, owner protection, User-account preservation,
 * stale-JWT session security, re-invitation, roster/account reconciliation, and
 * cross-tenant rejection.
 *
 * Creates its own throwaway companies and users and removes them in a finally
 * block, so it never mutates pre-existing development data.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { prisma } from '../backend/services/dbService';
import {
  ensureMembership,
  resolveMembership,
  isMemberOf,
  getEffectiveRole,
  listMemberships,
  removeMembership,
  requireActiveMembership,
  attachMembershipRole,
  MembershipError
} from '../backend/services/membershipService';
import {
  createInvitation,
  acceptInvitation,
  InvitationError
} from '../backend/services/invitationService';
import { requirePermission } from '../backend/services/permissionService';

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

async function assertRejects(fn: () => Promise<any>, expectedCode: string, title: string) {
  try {
    await fn();
    assert(false, title, 'Expected a rejection but the call succeeded');
  } catch (err: any) {
    const code = (err instanceof MembershipError || err instanceof InvitationError)
      ? err.code
      : err?.code;
    assert(code === expectedCode, title, `Expected ${expectedCode}, got ${code} (${err?.message})`);
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

/**
 * Simulates authenticateJWT -> guard -> requirePermission for one request.
 *
 * Both guards are async functions that call next() at the very end of their body,
 * so awaiting the returned promise guarantees the decision has been made. (An
 * earlier version raced this with a setTimeout and observed nothing.)
 */
async function runChain(
  jwtUser: any,
  guard: 'strict' | 'hydrate',
  action?: any
) {
  const req: any = { user: { ...jwtUser } };
  const res = mockResponse();
  const mw = guard === 'strict' ? requireActiveMembership : attachMembershipRole;

  let passedGuard = false;
  await mw(req, res, () => { passedGuard = true; });

  const snapshot = () => ({
    status: res.statusCode,
    body: res.jsonBody,
    roleSeen: req.user?.role
  });

  if (!passedGuard) return { reachedHandler: false, ...snapshot() };
  if (!action) return { reachedHandler: true, ...snapshot() };

  let reachedHandler = false;
  requirePermission(action)(req, res, () => { reachedHandler = true; });
  return { reachedHandler, ...snapshot() };
}

const stamp = Date.now();
const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

const createdUserIds: string[] = [];
const createdStartupIds: string[] = [];

async function makeCompany(label: string) {
  const owner = await prisma.user.create({
    data: {
      email: `t9_owner_${label}_${stamp}@test.catalyst`,
      name: `Owner ${label}`,
      role: 'Founder',
      passwordHash: await hashPassword('ownerpass123')
    }
  });
  createdUserIds.push(owner.id);

  const startup = await prisma.startup.create({
    data: {
      name: `T9 Co ${label} ${stamp}`,
      industry: 'Testing',
      description: 'Task 9 fixture company',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);

  await ensureMembership(owner.id, startup.id, 'FOUNDER');
  return { owner, startup };
}

/** Invites an email and accepts it as a brand-new user. */
async function joinAsNewMember(startupId: string, inviterId: string, email: string, role: string) {
  const invite = await createInvitation({ startupId, email, role, invitedById: inviterId });
  const accepted = await acceptInvitation({
    rawToken: invite.rawToken,
    password: 'memberpass123',
    name: email.split('@')[0],
    hashPassword
  });
  createdUserIds.push(accepted.userId);
  return accepted;
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('  P1 TASK 9 — MEMBERSHIP REMOVAL + PEOPLE RECONCILIATION');
  console.log('========================================================================');

  let dbUp = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbUp = false; }
  if (!dbUp) {
    console.log('\n  ⚠ Database unreachable — skipping integration tests.');
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    return;
  }

  const companyA = await makeCompany('A');
  const companyB = await makeCompany('B');

  // ── Removal ───────────────────────────────────────────────────────────────
  console.log('\n[1] Membership removal');

  const member = await joinAsNewMember(
    companyA.startup.id, companyA.owner.id, `t9_member_${stamp}@test.catalyst`, 'FINANCE'
  );
  const memberRow: any = await (prisma as any).membership.findUnique({
    where: { userId_startupId: { userId: member.userId, startupId: companyA.startup.id } }
  });
  assert(memberRow.status === 'ACTIVE', 'A newly joined member is ACTIVE');
  assert(await isMemberOf(member.userId, companyA.startup.id), 'Member has access before removal');

  const removed = await removeMembership(companyA.startup.id, memberRow.id, companyA.owner.id);
  assert(removed.status === 'SUSPENDED', 'Removal suspends the membership (not a hard delete)');
  assert(removed.email === `t9_member_${stamp}@test.catalyst`, 'Removal reports the right person');

  const afterRow: any = await (prisma as any).membership.findUnique({ where: { id: memberRow.id } });
  assert(afterRow !== null, 'The membership row is retained as an audit record');
  assert(afterRow.status === 'SUSPENDED', 'Retained row is SUSPENDED');

  assert(
    !(await isMemberOf(member.userId, companyA.startup.id)),
    'Removed member immediately loses access'
  );
  assert(
    (await resolveMembership(member.userId)) === null,
    'resolveMembership returns null for a suspended member'
  );

  // ── User account preserved ────────────────────────────────────────────────
  console.log('\n[2] User account preservation');

  const stillThere = await prisma.user.findUnique({ where: { id: member.userId } });
  assert(stillThere !== null, 'The User account still exists after membership removal');
  assert(Boolean(stillThere?.passwordHash), 'The User credentials are intact');
  assert(
    stillThere?.email === `t9_member_${stamp}@test.catalyst`,
    'The User identity is unchanged'
  );

  // ── Owner protection ──────────────────────────────────────────────────────
  console.log('\n[3] Owner protection');

  const ownerRow: any = await (prisma as any).membership.findUnique({
    where: { userId_startupId: { userId: companyA.owner.id, startupId: companyA.startup.id } }
  });
  await assertRejects(
    () => removeMembership(companyA.startup.id, ownerRow.id, companyA.owner.id),
    'OWNER_PROTECTED',
    'The owner membership cannot be removed by another actor'
  );
  await assertRejects(
    () => removeMembership(companyA.startup.id, ownerRow.id, companyA.owner.id),
    'OWNER_PROTECTED',
    'The founder cannot remove their own owner membership'
  );
  const ownerAfter: any = await (prisma as any).membership.findUnique({ where: { id: ownerRow.id } });
  assert(ownerAfter.status === 'ACTIVE', 'The owner membership remains ACTIVE');
  assert(
    (await getEffectiveRole(companyA.owner.id)) === 'FOUNDER',
    'The founder keeps the FOUNDER role'
  );

  // ── Idempotence / not found ───────────────────────────────────────────────
  console.log('\n[4] Repeat and missing targets');

  await assertRejects(
    () => removeMembership(companyA.startup.id, memberRow.id, companyA.owner.id),
    'ALREADY_REMOVED',
    'Removing an already-removed member is rejected'
  );
  await assertRejects(
    () => removeMembership(companyA.startup.id, 'no-such-membership-id', companyA.owner.id),
    'NOT_FOUND',
    'A non-existent membership id returns NOT_FOUND'
  );

  // ── Cross-tenant ──────────────────────────────────────────────────────────
  console.log('\n[5] Cross-company isolation');

  const bMember = await joinAsNewMember(
    companyB.startup.id, companyB.owner.id, `t9_bmember_${stamp}@test.catalyst`, 'HR'
  );
  const bRow: any = await (prisma as any).membership.findUnique({
    where: { userId_startupId: { userId: bMember.userId, startupId: companyB.startup.id } }
  });

  await assertRejects(
    () => removeMembership(companyA.startup.id, bRow.id, companyA.owner.id),
    'NOT_FOUND',
    'Company A cannot remove a Company B membership'
  );
  const bStill: any = await (prisma as any).membership.findUnique({ where: { id: bRow.id } });
  assert(bStill.status === 'ACTIVE', 'The Company B membership is untouched');
  await assertRejects(
    () => removeMembership(companyB.startup.id, ownerRow.id, companyB.owner.id),
    'NOT_FOUND',
    'Company B cannot remove the Company A owner membership'
  );

  // ── Session security: stale JWT ───────────────────────────────────────────
  console.log('\n[6] Session security (stale JWT cannot preserve access)');

  const activeMember = await joinAsNewMember(
    companyA.startup.id, companyA.owner.id, `t9_session_${stamp}@test.catalyst`, 'FINANCE'
  );
  // The session this member legitimately holds.
  const session = { id: activeMember.userId, email: '', name: '', role: 'FINANCE' };

  const before = await runChain(session, 'strict', 'people:read');
  assert(before.reachedHandler, 'Active member passes the company guard');
  assert(before.roleSeen === 'FINANCE', 'Guard hydrates the membership role');

  const activeRow: any = await (prisma as any).membership.findUnique({
    where: { userId_startupId: { userId: activeMember.userId, startupId: companyA.startup.id } }
  });
  await removeMembership(companyA.startup.id, activeRow.id, companyA.owner.id);

  // Same unexpired session, same claimed role.
  const after = await runChain(session, 'strict', 'people:read');
  assert(!after.reachedHandler, 'The same session is denied after removal');
  assert(after.status === 403, 'Denial is 403');
  assert(after.body?.code === 'NO_ACTIVE_MEMBERSHIP', 'Denial reports NO_ACTIVE_MEMBERSHIP');

  // A forged/stale privileged claim must not help either.
  const forged = await runChain(
    { ...session, role: 'FOUNDER' }, 'strict', 'approvals:review'
  );
  assert(
    !forged.reachedHandler && forged.status === 403,
    'A stale FOUNDER claim on a revoked session is still denied'
  );

  // The owner is unaffected by all of this.
  const ownerChain = await runChain(
    { id: companyA.owner.id, role: 'FINANCE' }, 'strict', 'approvals:review'
  );
  assert(
    ownerChain.reachedHandler && ownerChain.roleSeen === 'FOUNDER',
    'Owner session still passes, with membership role overriding the token claim'
  );

  // A user with no company at all must not pass the company guard.
  const outsider = await prisma.user.create({
    data: {
      email: `t9_outsider_${stamp}@test.catalyst`,
      name: 'Outsider',
      role: 'Founder',
      passwordHash: await hashPassword('outsiderpass123')
    }
  });
  createdUserIds.push(outsider.id);
  const outsiderChain = await runChain({ id: outsider.id, role: 'FOUNDER' }, 'strict', 'people:read');
  assert(
    !outsiderChain.reachedHandler && outsiderChain.status === 403,
    'A user with no membership is denied company-scoped routes despite a FOUNDER claim'
  );

  // attachMembershipRole (non-strict) must still answer for that user, so
  // /permissions/me keeps working pre-onboarding.
  const hydrateOnly = await runChain({ id: outsider.id, role: 'FOUNDER' }, 'hydrate');
  assert(hydrateOnly.reachedHandler, 'attachMembershipRole still passes a company-less user through');

  // ── Re-invitation ─────────────────────────────────────────────────────────
  console.log('\n[7] Re-invitation after removal');

  // Scope the duplicate-account check to this invitee's email. A global
  // prisma.user.count() is racy: the dev server or another suite can create a
  // user between the two reads, so it tests the database, not this behaviour.
  const memberEmail = `t9_member_${stamp}@test.catalyst`;
  const accountsForEmailBefore = await prisma.user.count({ where: { email: memberEmail } });
  const reinvite = await createInvitation({
    startupId: companyA.startup.id,
    email: `t9_member_${stamp}@test.catalyst`,
    role: 'OPERATIONS',
    invitedById: companyA.owner.id
  });
  assert(reinvite.invitation.status === 'PENDING', 'A removed member can be re-invited');
  assert(reinvite.invitation.role === 'OPERATIONS', 'The re-invitation carries the NEW role');

  const rejoined = await acceptInvitation({
    rawToken: reinvite.rawToken,
    authenticatedUserId: member.userId,
    hashPassword
  });
  assert(!rejoined.createdUser, 'Rejoining does not create a second User');
  assert(rejoined.userId === member.userId, 'Rejoining reuses the original User account');
  const accountsForEmailAfter = await prisma.user.count({ where: { email: memberEmail } });
  assert(
    accountsForEmailAfter === accountsForEmailBefore && accountsForEmailAfter === 1,
    'Exactly one User row still exists for that email after rejoin (no duplicate account)',
    `before=${accountsForEmailBefore} after=${accountsForEmailAfter}`
  );

  const rejoinRows = await (prisma as any).membership.count({
    where: { userId: member.userId, startupId: companyA.startup.id }
  });
  assert(rejoinRows === 1, 'Rejoining reactivates the existing membership (no duplicate row)');

  const rejoinedMembership = await resolveMembership(member.userId);
  assert(rejoinedMembership?.status === 'ACTIVE', 'The reactivated membership is ACTIVE');
  assert(
    rejoinedMembership?.role === 'OPERATIONS',
    'The reactivated membership takes the new role, not the old FINANCE role'
  );
  assert(
    await isMemberOf(member.userId, companyA.startup.id),
    'The rejoined member has access again'
  );

  const rejoinChain = await runChain(
    { id: member.userId, role: 'FINANCE' }, 'strict', 'people:read'
  );
  assert(
    rejoinChain.reachedHandler && rejoinChain.roleSeen === 'OPERATIONS',
    'Rejoined session resolves to the new role, overriding the stale FINANCE claim'
  );

  // An ACTIVE member still cannot be re-invited.
  await assertRejects(
    () => createInvitation({
      startupId: companyA.startup.id,
      email: `t9_member_${stamp}@test.catalyst`,
      role: 'HR',
      invitedById: companyA.owner.id
    }),
    'ALREADY_MEMBER',
    'An ACTIVE member cannot be re-invited'
  );

  // ── listMemberships status filter ─────────────────────────────────────────
  console.log('\n[8] Company Accounts listing');

  const activeList = await listMemberships(companyA.startup.id);
  const activeIds = activeList.map((m: any) => m.userId);
  assert(
    !activeIds.includes(activeMember.userId),
    'A suspended member does not appear under Company Accounts'
  );
  assert(activeIds.includes(member.userId), 'A rejoined member does appear');
  assert(activeIds.includes(companyA.owner.id), 'The owner appears');
  assert(
    activeList.every((m: any) => m.status === 'ACTIVE'),
    'Only ACTIVE memberships are listed'
  );

  const withSuspended = await listMemberships(companyA.startup.id, { includeSuspended: true });
  assert(
    withSuspended.length > activeList.length,
    'Suspended memberships are still retrievable for audit'
  );

  assert(
    activeList.every((m: any) => m.startupId === companyA.startup.id),
    'Listing is confined to one company'
  );

  // ── People reconciliation ─────────────────────────────────────────────────
  console.log('\n[9] People reconciliation (roster vs account)');

  // Build the four roster cases.
  const sharedEmail = `t9_both_${stamp}@test.catalyst`;
  const rosterOnlyEmail = `t9_rosteronly_${stamp}@test.catalyst`;

  async function addRosterEntry(email: string, name: string) {
    return prisma.memory.create({
      data: {
        category: 'TEAM_MEMBER',
        title: name,
        description: JSON.stringify({
          fullName: name, role: 'GROWTH', department: 'Growth',
          email, status: 'Active'
        }),
        startupId: companyA.startup.id
      }
    });
  }

  await addRosterEntry(rosterOnlyEmail, 'Roster Only Person');
  // Same person, mixed case on the roster side, to prove case-insensitive matching.
  await addRosterEntry(sharedEmail.toUpperCase(), 'Both Person');
  const bothJoin = await joinAsNewMember(
    companyA.startup.id, companyA.owner.id, sharedEmail, 'GROWTH'
  );

  // Replicate the reconciliation the API performs.
  const memories = await prisma.memory.findMany({
    where: { startupId: companyA.startup.id, category: 'TEAM_MEMBER' }
  });
  const accounts = await listMemberships(companyA.startup.id);
  const accountEmails = new Set(
    accounts.map((m: any) => (m.user?.email || '').trim().toLowerCase()).filter(Boolean)
  );
  const roster = memories.map(m => {
    const parsed = JSON.parse(m.description);
    const email = (parsed.email || '').trim().toLowerCase();
    return { email, hasAccount: Boolean(email && accountEmails.has(email)) };
  });
  const rosterOnly = roster.filter(r => !r.hasAccount);

  assert(
    rosterOnly.some(r => r.email === rosterOnlyEmail),
    'A roster-only person appears once, in the roster'
  );
  assert(
    !rosterOnly.some(r => r.email === sharedEmail),
    'A person with BOTH a roster entry and an account is not duplicated in the roster'
  );
  assert(
    accountEmails.has(sharedEmail),
    'That same person appears under Company Accounts (account takes precedence)'
  );
  assert(
    !accountEmails.has(rosterOnlyEmail),
    'The roster-only person does not appear under Company Accounts'
  );
  assert(
    roster.find(r => r.email === sharedEmail)?.hasAccount === true,
    'Case-insensitive email matching links the roster entry to the account'
  );
  assert(
    memories.some(m => JSON.parse(m.description).email?.toLowerCase() === sharedEmail),
    'The legacy roster Memory row is preserved, not deleted'
  );

  // After removal the same person should fall back to roster-only.
  const bothRow: any = await (prisma as any).membership.findUnique({
    where: { userId_startupId: { userId: bothJoin.userId, startupId: companyA.startup.id } }
  });
  await removeMembership(companyA.startup.id, bothRow.id, companyA.owner.id);

  const accountsAfter = await listMemberships(companyA.startup.id);
  const emailsAfter = new Set(
    accountsAfter.map((m: any) => (m.user?.email || '').trim().toLowerCase())
  );
  assert(!emailsAfter.has(sharedEmail), 'After removal they leave Company Accounts');
  const rosterAfter = memories.map(m => {
    const parsed = JSON.parse(m.description);
    const email = (parsed.email || '').trim().toLowerCase();
    return { email, hasAccount: Boolean(email && emailsAfter.has(email)) };
  }).filter(r => !r.hasAccount);
  assert(
    rosterAfter.some(r => r.email === sharedEmail),
    'After removal they reappear as roster-only (roster data preserved)'
  );

  // ── Permission matrix for removal ─────────────────────────────────────────
  console.log('\n[10] Removal authorization');

  // P1 Task 10: membership removal is an ACCOUNT-ACCESS operation and now
  // requires people:access, so HR (people:write only) is forbidden.
  function guardOnly(role: string | undefined, action: any = 'people:access') {
    const res = mockResponse();
    let nexted = false;
    requirePermission(action)({ user: role ? { role } : undefined } as any, res, () => { nexted = true; });
    return { nexted, status: res.statusCode };
  }
  assert(guardOnly('FOUNDER').nexted, 'FOUNDER may remove members');
  assert(guardOnly('ADMIN').nexted, 'ADMIN may remove members');
  const hrRemove = guardOnly('HR');
  assert(
    !hrRemove.nexted && hrRemove.status === 403,
    'HR may NOT remove members: holds people:write but not people:access (P1 Task 10)'
  );
  assert(guardOnly('HR', 'people:write').nexted, 'HR retains people:write for roster management');
  const fin = guardOnly('FINANCE');
  assert(!fin.nexted && fin.status === 403, 'FINANCE cannot remove members (403)');
  const ops = guardOnly('OPERATIONS');
  assert(!ops.nexted && ops.status === 403, 'OPERATIONS cannot remove members (403)');
  const growth = guardOnly('GROWTH');
  assert(!growth.nexted && growth.status === 403, 'GROWTH cannot remove members (403)');
  const anon = guardOnly(undefined);
  assert(!anon.nexted && anon.status === 401, 'Unauthenticated removal attempt is 401');

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exitCode = 1;
}

async function cleanup() {
  try {
    if (createdStartupIds.length) {
      await prisma.memory.deleteMany({ where: { startupId: { in: createdStartupIds } } });
      await (prisma as any).invitation.deleteMany({ where: { startupId: { in: createdStartupIds } } });
      await (prisma as any).membership.deleteMany({ where: { startupId: { in: createdStartupIds } } });
      await prisma.timelineItem.deleteMany({ where: { startupId: { in: createdStartupIds } } });
      await prisma.startup.deleteMany({ where: { id: { in: createdStartupIds } } });
    }
    if (createdUserIds.length) {
      await (prisma as any).membership.deleteMany({ where: { userId: { in: createdUserIds } } });
      await (prisma as any).invitation.deleteMany({ where: { invitedById: { in: createdUserIds } } });
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
