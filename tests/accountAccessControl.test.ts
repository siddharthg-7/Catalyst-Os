/**
 * CatalystOS — P1 Task 10 test suite: Account Access Control (people:access).
 *
 * Verifies that account-access mutations (creating, resending, and revoking
 * invitations, and suspending memberships) sit behind the single, unified
 * 'people:access' permission held exclusively by FOUNDER and ADMIN.
 *
 * Confirms that HR retains roster management ('people:write') and directory reading
 * ('people:read') but is forbidden from granting or revoking system account access.
 *
 * Cleans up all throwaway companies, memberships, and invitations in a finally block.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import {
  ROLE_PERMISSIONS,
  ROLES,
  Role,
  requirePermission,
  getPermissions
} from '../backend/services/permissionService';
import {
  ensureMembership,
  resolveMembership,
  removeMembership,
  isMemberOf,
  listMemberships
} from '../backend/services/membershipService';
import {
  createInvitation,
  acceptInvitation,
  revokeInvitation,
  resendInvitation,
  peekInvitation,
  listInvitations
} from '../backend/services/invitationService';

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

function mockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

function runGuard(action: any, role?: string) {
  const res = mockResponse();
  let nexted = false;
  const middleware = requirePermission(action);
  middleware({ user: role ? { role } : undefined } as any, res, () => {
    nexted = true;
  });
  return { nexted, status: res.statusCode, body: res.body };
}

const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

async function run() {
  console.log('\n========================================================================');
  console.log('  P1 TASK 10 — ACCOUNT ACCESS CONTROL (people:access)');
  console.log('========================================================================\n');

  const stamp = Date.now();
  let userA: any;
  let userB: any;
  let startupA: any;
  let startupB: any;

  try {
    // ── 1. Static Permission Matrix Verification ───────────────────────────
    console.log('[1] Static Permission Matrix');

    // FOUNDER & ADMIN must have read, write, access
    assert(ROLE_PERMISSIONS.FOUNDER.actions.includes('people:access'), 'FOUNDER holds people:access');
    assert(ROLE_PERMISSIONS.FOUNDER.actions.includes('people:write'), 'FOUNDER holds people:write');
    assert(ROLE_PERMISSIONS.FOUNDER.actions.includes('people:read'), 'FOUNDER holds people:read');

    assert(ROLE_PERMISSIONS.ADMIN.actions.includes('people:access'), 'ADMIN holds people:access');
    assert(ROLE_PERMISSIONS.ADMIN.actions.includes('people:write'), 'ADMIN holds people:write');
    assert(ROLE_PERMISSIONS.ADMIN.actions.includes('people:read'), 'ADMIN holds people:read');

    // HR holds write and read, but explicitly NOT people:access
    assert(!ROLE_PERMISSIONS.HR.actions.includes('people:access'), 'HR does NOT hold people:access');
    assert(ROLE_PERMISSIONS.HR.actions.includes('people:write'), 'HR holds people:write');
    assert(ROLE_PERMISSIONS.HR.actions.includes('people:read'), 'HR holds people:read');

    // FINANCE, OPERATIONS, GROWTH hold people:read, but neither write nor access
    const staffRoles: Role[] = ['FINANCE', 'OPERATIONS', 'GROWTH'];
    for (const role of staffRoles) {
      assert(!ROLE_PERMISSIONS[role].actions.includes('people:access'), `${role} does NOT hold people:access`);
      assert(!ROLE_PERMISSIONS[role].actions.includes('people:write'), `${role} does NOT hold people:write`);
      assert(ROLE_PERMISSIONS[role].actions.includes('people:read'), `${role} holds people:read (directory access)`);
      assert(ROLE_PERMISSIONS[role].areas.includes('people'), `${role} retains people sidebar area`);
    }

    // ── 2. Guard Middleware Authorization Tests ─────────────────────────────
    console.log('\n[2] requirePermission("people:access") Guard');

    assert(runGuard('people:access', 'FOUNDER').nexted, 'FOUNDER passes people:access');
    assert(runGuard('people:access', 'ADMIN').nexted, 'ADMIN passes people:access');

    const hrAccess = runGuard('people:access', 'HR');
    assert(!hrAccess.nexted && hrAccess.status === 403, 'HR is forbidden from people:access (403)');

    const finAccess = runGuard('people:access', 'FINANCE');
    assert(!finAccess.nexted && finAccess.status === 403, 'FINANCE is forbidden from people:access (403)');

    const opsAccess = runGuard('people:access', 'OPERATIONS');
    assert(!opsAccess.nexted && opsAccess.status === 403, 'OPERATIONS is forbidden from people:access (403)');

    const growthAccess = runGuard('people:access', 'GROWTH');
    assert(!growthAccess.nexted && growthAccess.status === 403, 'GROWTH is forbidden from people:access (403)');

    const anonAccess = runGuard('people:access', undefined);
    assert(!anonAccess.nexted && anonAccess.status === 401, 'Unauthenticated caller is 401');

    console.log('\n[3] requirePermission("people:write") Roster Guard');
    assert(runGuard('people:write', 'FOUNDER').nexted, 'FOUNDER passes people:write');
    assert(runGuard('people:write', 'ADMIN').nexted, 'ADMIN passes people:write');
    assert(runGuard('people:write', 'HR').nexted, 'HR passes people:write for roster management');
    assert(!runGuard('people:write', 'FINANCE').nexted, 'FINANCE is forbidden from people:write');
    assert(!runGuard('people:write', 'OPERATIONS').nexted, 'OPERATIONS is forbidden from people:write');
    assert(!runGuard('people:write', 'GROWTH').nexted, 'GROWTH is forbidden from people:write');

    // ── 3. Database Fixture Creation ───────────────────────────────────────
    console.log('\n[4] Database Fixtures');
    const hash = await hashPassword('secret123');

    userA = await prisma.user.create({
      data: {
        email: `t10_owner_a_${stamp}@test.catalyst`,
        name: 'T10 Owner A',
        role: 'Founder',
        passwordHash: hash
      }
    });

    userB = await prisma.user.create({
      data: {
        email: `t10_owner_b_${stamp}@test.catalyst`,
        name: 'T10 Owner B',
        role: 'Founder',
        passwordHash: hash
      }
    });

    startupA = await prisma.startup.create({
      data: {
        name: `T10 Co A ${stamp}`,
        industry: 'Software',
        description: 'Test software startup A',
        ownerId: userA.id
      }
    });

    startupB = await prisma.startup.create({
      data: {
        name: `T10 Co B ${stamp}`,
        industry: 'Logistics',
        description: 'Test logistics startup B',
        ownerId: userB.id
      }
    });

    await ensureMembership(userA.id, startupA.id, 'FOUNDER');
    await ensureMembership(userB.id, startupB.id, 'FOUNDER');

    // ── 4. End-to-End Account Access: Invitation Lifecycle ─────────────────
    console.log('\n[5] Invitation Account-Access Actions');

    // Create an invitation
    const created = await createInvitation({
      startupId: startupA.id,
      email: `t10_member_${stamp}@test.catalyst`,
      role: 'FINANCE',
      invitedById: userA.id
    });
    assert(created.invitation.status === 'PENDING', 'Invitation created with PENDING status');

    // Re-issue / resend invitation
    const resent = await resendInvitation(startupA.id, created.invitation.id, userA.id);
    assert(resent.invitation.status === 'PENDING', 'Resent invitation has fresh PENDING status');
    assert(resent.invitation.id !== created.invitation.id, 'Resend created a newly issued token');

    // Acceptance (Public Boundary — unauthenticated invitee)
    const acceptedNew = await acceptInvitation({
      rawToken: resent.rawToken,
      password: 'newPassword123!',
      name: 'New Finance Member',
      hashPassword
    });
    assert(acceptedNew.role === 'FINANCE', 'Invitee accepted and gained FINANCE membership');
    assert(acceptedNew.startupId === startupA.id, 'Membership belongs to Startup A');

    const memberRow: any = await (prisma as any).membership.findUnique({
      where: { userId_startupId: { userId: acceptedNew.userId, startupId: startupA.id } }
    });
    assert(memberRow.status === 'ACTIVE', 'Membership is ACTIVE in database');

    // ── 5. End-to-End Account Access: Membership Suspension ────────────────
    console.log('\n[6] Membership Suspension Account-Access Action');

    // Remove / suspend membership
    const removal = await removeMembership(startupA.id, memberRow.id, userA.id);
    assert(removal.status === 'SUSPENDED', 'Membership suspended by Founder');

    // Suspended member cannot resolve membership
    const resolved = await resolveMembership(acceptedNew.userId, startupA.id);
    assert(resolved === null, 'Suspended member has no active company membership');

    // ── 6. Cross-Tenant Protection on people:access ────────────────────────
    console.log('\n[7] Cross-Tenant Account-Access Isolation');

    // Company B founder cannot remove Company A membership
    let crossRemovalBlocked = false;
    try {
      await removeMembership(startupB.id, memberRow.id, userB.id);
    } catch (err: any) {
      crossRemovalBlocked = true;
      assert(err.code === 'NOT_FOUND', 'Company B cannot remove Company A membership');
    }
    assert(crossRemovalBlocked, 'Cross-company membership suspension was rejected');

    // Company B founder cannot revoke Company A invitation
    const created2 = await createInvitation({
      startupId: startupA.id,
      email: `t10_member2_${stamp}@test.catalyst`,
      role: 'OPERATIONS',
      invitedById: userA.id
    });

    let crossRevokeBlocked = false;
    try {
      await revokeInvitation(startupB.id, created2.invitation.id);
    } catch (err: any) {
      crossRevokeBlocked = true;
      assert(err.code === 'NOT_FOUND', 'Company B cannot revoke Company A invitation');
    }
    assert(crossRevokeBlocked, 'Cross-company invitation revocation was rejected');

    // Clean up second invite
    await revokeInvitation(startupA.id, created2.invitation.id);

    // ── 7. Effective Permissions Structure Verification ────────────────────
    console.log('\n[8] Effective Permissions Structure');

    const founderPerms = getPermissions('FOUNDER');
    assert(founderPerms.actions.includes('people:access'), 'founderPerms includes people:access');
    assert(founderPerms.actions.includes('people:write'), 'founderPerms includes people:write');
    assert(founderPerms.actions.includes('people:read'), 'founderPerms includes people:read');

    const hrPerms = getPermissions('HR');
    assert(!hrPerms.actions.includes('people:access'), 'hrPerms excludes people:access');
    assert(hrPerms.actions.includes('people:write'), 'hrPerms includes people:write');
    assert(hrPerms.actions.includes('people:read'), 'hrPerms includes people:read');

    const financePerms = getPermissions('FINANCE');
    assert(!financePerms.actions.includes('people:access'), 'financePerms excludes people:access');
    assert(!financePerms.actions.includes('people:write'), 'financePerms excludes people:write');
    assert(financePerms.actions.includes('people:read'), 'financePerms includes people:read');

  } catch (err: any) {
    console.error('💥 Unexpected test error:', err);
    failed++;
  } finally {
    console.log('\n[9] Cleaning up throwaway test data...');
    try {
      if (startupA?.id) {
        await (prisma as any).invitation.deleteMany({ where: { startupId: startupA.id } });
        await (prisma as any).membership.deleteMany({ where: { startupId: startupA.id } });
        await prisma.startup.delete({ where: { id: startupA.id } });
      }
      if (startupB?.id) {
        await (prisma as any).invitation.deleteMany({ where: { startupId: startupB.id } });
        await (prisma as any).membership.deleteMany({ where: { startupId: startupB.id } });
        await prisma.startup.delete({ where: { id: startupB.id } });
      }
      if (userA?.id) await prisma.user.delete({ where: { id: userA.id } });
      if (userB?.id) await prisma.user.delete({ where: { id: userB.id } });
      console.log('  Cleaned up test data.');
    } catch (cleanupErr: any) {
      console.warn('  Cleanup note:', cleanupErr.message);
    }
  }

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

run();
