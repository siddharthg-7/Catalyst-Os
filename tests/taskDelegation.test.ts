/**
 * CatalystOS — Phase A3 test suite: task decomposition & delegation.
 *
 * Covers persistence of council work orders as Task rows, department -> role
 * ownership, role-scoped listing, tenant isolation, and the status transitions
 * reserved for the founder approval loop.
 *
 * Creates its own throwaway companies and users and removes them in a finally
 * block, so it never mutates pre-existing development data.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import { ensureMembership } from '../backend/services/membershipService';
import {
  delegateWorkOrders,
  listTasksForUser,
  updateTaskForUser,
  ownerRoleForDepartment,
  agentForDepartment,
  TaskDelegationError
} from '../backend/services/taskDelegationService';

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
    const code = err instanceof TaskDelegationError ? err.code : err?.code;
    assert(code === expectedCode, title, `Expected ${expectedCode}, got ${code} (${err?.message})`);
  }
}

const stamp = Date.now();
const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
const createdUserIds: string[] = [];
const createdStartupIds: string[] = [];

async function makeUser(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `a3_${label}_${stamp}@test.catalyst`,
      name: `A3 ${label}`,
      role: 'Founder',
      passwordHash: await hashPassword('a3pass123')
    }
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeCompany(label: string) {
  const owner = await makeUser(`owner_${label}`);
  const startup = await prisma.startup.create({
    data: {
      name: `A3 Co ${label} ${stamp}`,
      industry: 'Testing',
      description: 'Phase A3 fixture company',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);
  await ensureMembership(owner.id, startup.id, 'FOUNDER');
  return { owner, startup };
}

/** The work orders multiAgentCouncil.decompose emits for a hiring command. */
const HIRING_WORK_ORDERS = [
  { department: 'TALENT', objective: 'Analyze candidate role profile and compensation bands' },
  { department: 'FINANCE', objective: 'Assess fully loaded burn rate impact and runway compression' },
  { department: 'LEGAL', objective: 'Determine IP assignment and employment compliance' },
  { department: 'OPERATIONS', objective: 'Map start timeline and onboarding capacity' },
  { department: 'AUDITOR', objective: 'Independently audit numbers against the deterministic engine' }
];

async function runTests() {
  console.log('\n========================================================================');
  console.log('  PHASE A3 — TASK DECOMPOSITION & DELEGATION');
  console.log('========================================================================');

  // ── Pure mapping ─────────────────────────────────────────────────────────
  console.log('\n[1] Department -> owner role mapping');

  assert(ownerRoleForDepartment('TALENT') === 'HR', 'TALENT work is owned by HR');
  assert(ownerRoleForDepartment('FINANCE') === 'FINANCE', 'FINANCE work is owned by FINANCE');
  assert(ownerRoleForDepartment('GROWTH') === 'GROWTH', 'GROWTH work is owned by GROWTH');
  assert(ownerRoleForDepartment('OPERATIONS') === 'OPERATIONS', 'OPERATIONS work is owned by OPERATIONS');
  assert(
    ownerRoleForDepartment('LEGAL') === null,
    'LEGAL has no human owner (no invented employee)'
  );
  assert(
    ownerRoleForDepartment('AUDITOR') === null,
    'AUDITOR has no human owner (no invented employee)'
  );
  assert(ownerRoleForDepartment('talent') === 'HR', 'Department matching is case-insensitive');
  assert(ownerRoleForDepartment('NONSENSE') === null, 'Unknown department has no owner');
  assert(agentForDepartment('TALENT') === 'Talent', 'TALENT is assisted by the Talent agent');
  assert(agentForDepartment('FINANCE') === 'CFO', 'FINANCE is assisted by the CFO agent');

  let dbUp = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbUp = false; }
  if (!dbUp) {
    console.log('\n  ⚠ Database unreachable — skipping integration tests.');
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    return;
  }

  const companyA = await makeCompany('A');
  const companyB = await makeCompany('B');

  // ── Persistence ──────────────────────────────────────────────────────────
  console.log('\n[2] Work orders are persisted as Task rows');

  const delegated = await delegateWorkOrders(companyA.startup.id, HIRING_WORK_ORDERS);
  assert(delegated.length === 5, 'All five work orders are persisted', `got ${delegated.length}`);

  const talentTask = delegated.find(t => t.department === 'TALENT');
  assert(talentTask?.ownerRole === 'HR', 'The TALENT task is owned by HR');
  assert(talentTask?.agent === 'Talent', 'The TALENT task names its assisting agent');
  assert(talentTask?.status === 'pending', 'A delegated task starts pending');
  assert(
    talentTask?.title === 'Analyze candidate role profile and compensation bands',
    'The objective survives round-tripping without the encoded prefix'
  );
  assert(talentTask?.needsHumanOwner === false, 'A task with a human role does not need an owner');

  const legalTask = delegated.find(t => t.department === 'LEGAL');
  assert(legalTask?.ownerRole === null, 'The LEGAL task has no human owner');
  assert(
    legalTask?.needsHumanOwner === true,
    'The LEGAL task is flagged as needing a human owner (founder assigns or invites)'
  );

  const persisted = await (prisma as any).task.count({
    where: { plan: { startupId: companyA.startup.id } }
  });
  assert(persisted === 5, 'Rows really exist in the database', `counted ${persisted}`);

  // ── Idempotence ──────────────────────────────────────────────────────────
  console.log('\n[3] Re-delegation does not duplicate');

  const again = await delegateWorkOrders(companyA.startup.id, HIRING_WORK_ORDERS);
  assert(again.length === 5, 'Re-delegation returns the same five tasks');
  const afterRepeat = await (prisma as any).task.count({
    where: { plan: { startupId: companyA.startup.id } }
  });
  assert(afterRepeat === 5, 'No duplicate rows were created', `counted ${afterRepeat}`);

  // ── Role-scoped listing ──────────────────────────────────────────────────
  console.log('\n[4] Listing is scoped by role');

  const founderView = await listTasksForUser(companyA.owner.id);
  assert(founderView.length === 5, 'FOUNDER sees the whole workload', `got ${founderView.length}`);

  const hrUser = await makeUser('hr');
  await ensureMembership(hrUser.id, companyA.startup.id, 'HR');
  const hrView = await listTasksForUser(hrUser.id);
  assert(hrView.length === 1, 'HR sees only their own department', `got ${hrView.length}`);
  assert(hrView[0]?.department === 'TALENT', 'HR sees the TALENT task');
  assert(
    !hrView.some(t => t.department === 'FINANCE'),
    'HR cannot see FINANCE work (employee is not shown the whole company workload)'
  );

  const finUser = await makeUser('fin');
  await ensureMembership(finUser.id, companyA.startup.id, 'FINANCE');
  const finView = await listTasksForUser(finUser.id);
  assert(finView.length === 1 && finView[0].department === 'FINANCE', 'FINANCE sees only FINANCE work');

  const growthUser = await makeUser('growth');
  await ensureMembership(growthUser.id, companyA.startup.id, 'GROWTH');
  const growthView = await listTasksForUser(growthUser.id);
  assert(growthView.length === 0, 'GROWTH sees nothing for a hiring decomposition');

  // ── Tenant isolation ─────────────────────────────────────────────────────
  console.log('\n[5] Tenant isolation');

  await delegateWorkOrders(companyB.startup.id, [
    { department: 'GROWTH', objective: 'Model campaign CAC and channel scaling' }
  ]);

  const bFounderView = await listTasksForUser(companyB.owner.id);
  assert(bFounderView.length === 1, 'Company B sees only its own task', `got ${bFounderView.length}`);
  assert(
    !bFounderView.some(t => t.department === 'TALENT'),
    'Company B cannot see Company A tasks'
  );
  const aStillFive = await listTasksForUser(companyA.owner.id);
  assert(aStillFive.length === 5, 'Company A is unaffected by Company B delegation');

  const bTaskId = bFounderView[0].id;
  await assertRejects(
    () => updateTaskForUser({ userId: companyA.owner.id, taskId: bTaskId, status: 'in_progress' }),
    'NOT_FOUND',
    'Company A cannot update a Company B task (reads as 404, no existence oracle)'
  );

  const outsider = await makeUser('outsider');
  await assertRejects(
    () => listTasksForUser(outsider.id),
    'NO_ACTIVE_MEMBERSHIP',
    'A user with no membership cannot list tasks'
  );

  // ── Updates ──────────────────────────────────────────────────────────────
  console.log('\n[6] Task updates');

  const hrTaskId = hrView[0].id;
  const started = await updateTaskForUser({
    userId: hrUser.id, taskId: hrTaskId, status: 'in_progress'
  });
  assert(started.status === 'in_progress', 'HR can start their own task');

  const submitted = await updateTaskForUser({
    userId: hrUser.id,
    taskId: hrTaskId,
    status: 'submitted',
    result: 'Drafted hiring plan for 2 senior engineers.'
  });
  assert(submitted.status === 'submitted', 'HR can submit their own work');
  assert(
    submitted.result === 'Drafted hiring plan for 2 senior engineers.',
    'The submitted result is stored'
  );

  await assertRejects(
    () => updateTaskForUser({ userId: hrUser.id, taskId: hrTaskId, status: 'approved' }),
    'APPROVAL_RESERVED',
    'An employee cannot approve their own submitted work'
  );
  await assertRejects(
    () => updateTaskForUser({ userId: hrUser.id, taskId: hrTaskId, status: 'rejected' }),
    'APPROVAL_RESERVED',
    'An employee cannot reject work either'
  );

  const approved = await updateTaskForUser({
    userId: companyA.owner.id, taskId: hrTaskId, status: 'approved'
  });
  assert(approved.status === 'approved', 'The founder can approve submitted work');

  const financeTaskId = finView[0].id;
  await assertRejects(
    () => updateTaskForUser({ userId: hrUser.id, taskId: financeTaskId, status: 'in_progress' }),
    'NOT_TASK_OWNER',
    'HR cannot touch a FINANCE task'
  );

  await assertRejects(
    () => updateTaskForUser({ userId: companyA.owner.id, taskId: hrTaskId, status: 'teleported' }),
    'INVALID_STATUS',
    'An unknown status is rejected'
  );
  await assertRejects(
    () => updateTaskForUser({ userId: companyA.owner.id, taskId: hrTaskId }),
    'NO_CHANGES',
    'An empty update is rejected'
  );
  await assertRejects(
    () => updateTaskForUser({ userId: companyA.owner.id, taskId: 'no-such-task', status: 'pending' }),
    'NOT_FOUND',
    'An unknown task id returns NOT_FOUND'
  );

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exitCode = 1;
}

async function cleanup() {
  try {
    if (createdStartupIds.length) {
      const plans = await prisma.plan.findMany({
        where: { startupId: { in: createdStartupIds } }, select: { id: true }
      });
      const planIds = plans.map(p => p.id);
      if (planIds.length) {
        await (prisma as any).task.deleteMany({ where: { planId: { in: planIds } } });
        await prisma.approval.deleteMany({ where: { planId: { in: planIds } } });
        await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
      }
      await (prisma as any).membership.deleteMany({ where: { startupId: { in: createdStartupIds } } });
      await prisma.startup.deleteMany({ where: { id: { in: createdStartupIds } } });
    }
    if (createdUserIds.length) {
      await (prisma as any).membership.deleteMany({ where: { userId: { in: createdUserIds } } });
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
