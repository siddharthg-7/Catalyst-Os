/**
 * CatalystOS — Phase A4 test suite: Explicit Plan & Task Decomposition.
 *
 * Verifies that the Founder Assistant turns a command into an explicit Plan
 * with sequential tasks reusing the existing `Plan` and `Task` Prisma models.
 *
 * Canonical test case:
 * Founder: "Prepare a hiring plan for two senior developers."
 *                ↓
 * PLAN:
 * 1. Analyze current engineering capacity
 * 2. Determine hiring requirements
 * 3. Check hiring policy
 * 4. Analyze budget impact
 * 5. Draft hiring plan
 * 6. Submit for review
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import { ensureMembership } from '../backend/services/membershipService';
import {
  buildPlanStepsForCommand,
  formatPlanAsText,
  decomposeCommandToPlan,
  listPlansForUser,
  getPlanById,
  listTasksForUser,
  TaskDelegationError
} from '../backend/services/taskDelegationService';
import { orchestrationService } from '../backend/services/orchestrationService';

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
      email: `a4_${label}_${stamp}@test.catalyst`,
      name: `A4 ${label}`,
      role: 'Founder',
      passwordHash: await hashPassword('a4pass123')
    }
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeCompany(label: string) {
  const owner = await makeUser(`owner_${label}`);
  const startup = await prisma.startup.create({
    data: {
      name: `A4 Co ${label} ${stamp}`,
      industry: 'Enterprise Software',
      description: 'Phase A4 plan decomposition test venture',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);
  await ensureMembership(owner.id, startup.id, 'FOUNDER');
  return { owner, startup };
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('  PHASE A4 — EXPLICIT PLAN & TASK DECOMPOSITION AUDIT');
  console.log('========================================================================');

  const command = 'Prepare a hiring plan for two senior developers.';

  // ── [1] Pure Plan Step Generation ──────────────────────────────────────────
  console.log('\n[1] Canonical Command -> Explicit Plan Steps');

  const planSpec = buildPlanStepsForCommand(command);
  assert(
    planSpec.title === 'Hiring Plan: Two Senior Developers',
    'Plan title cleanly captures hiring objective for senior developers',
    `got: "${planSpec.title}"`
  );
  assert(planSpec.steps.length === 6, 'Plan contains exactly 6 ordered steps', `got ${planSpec.steps.length}`);

  const expectedTitles = [
    'Analyze current engineering capacity',
    'Determine hiring requirements',
    'Check hiring policy',
    'Analyze budget impact',
    'Draft hiring plan',
    'Submit for review'
  ];

  expectedTitles.forEach((expected, idx) => {
    assert(
      planSpec.steps[idx]?.title === expected,
      `Step ${idx + 1} matches: "${expected}"`,
      `got: "${planSpec.steps[idx]?.title}"`
    );
  });

  const formattedText = formatPlanAsText(planSpec.title, planSpec.steps);
  assert(formattedText.includes('PLAN'), 'Formatted text has PLAN header');
  assert(formattedText.includes('1. Analyze current engineering capacity'), 'Formatted text includes step 1');
  assert(formattedText.includes('6. Submit for review'), 'Formatted text includes step 6');

  let dbUp = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbUp = false; }
  if (!dbUp) {
    console.log('\n  ⚠ Database unreachable — skipping database persistence tests.');
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    return;
  }

  const companyA = await makeCompany('A');
  const companyB = await makeCompany('B');

  // ── [2] Database Model Reuse: Plan and Task rows ───────────────────────────
  console.log('\n[2] Database Model Reuse: Plan and Task Persistence');

  const commandId = `cmd_a4_${Date.now()}`;
  const planResult = await decomposeCommandToPlan({
    startupId: companyA.startup.id,
    command,
    commandId
  });

  assert(Boolean(planResult.plan?.id), 'Plan has a persistent ID');
  assert(planResult.plan.title === 'Hiring Plan: Two Senior Developers', 'Persisted plan title matches');
  assert(planResult.tasks.length === 6, 'Decomposed result contains 6 tasks', `got ${planResult.tasks.length}`);

  // Query database directly to verify reuse of Prisma Plan model
  const planRow = await (prisma as any).plan.findUnique({
    where: { id: planResult.plan.id },
    include: { tasks: true }
  });
  assert(Boolean(planRow), 'Plan row exists in database via Prisma Plan model');
  assert(planRow.startupId === companyA.startup.id, 'Plan belongs to company A');
  assert(planRow.tasks.length === 6, 'Plan in database has 6 associated Task rows');

  // ── [3] Task Role & Department Ownership ──────────────────────────────────
  console.log('\n[3] Task Role & Department Ownership');

  const capacityTask = planResult.tasks.find(t => t.title.includes('engineering capacity'));
  assert(capacityTask?.department === 'OPERATIONS', 'Capacity task belongs to OPERATIONS');
  assert(capacityTask?.ownerRole === 'OPERATIONS', 'Capacity task owned by OPERATIONS role');

  const reqTask = planResult.tasks.find(t => t.title.includes('hiring requirements'));
  assert(reqTask?.department === 'TALENT', 'Hiring requirements task belongs to TALENT');
  assert(reqTask?.ownerRole === 'HR', 'Hiring requirements task owned by HR role');

  const policyTask = planResult.tasks.find(t => t.title.includes('hiring policy'));
  assert(policyTask?.department === 'LEGAL', 'Policy task belongs to LEGAL');
  assert(policyTask?.ownerRole === null, 'Policy task has no human employee role');
  assert(policyTask?.needsHumanOwner === true, 'Policy task flagged as needing human owner');

  const budgetTask = planResult.tasks.find(t => t.title.includes('budget impact'));
  assert(budgetTask?.department === 'FINANCE', 'Budget task belongs to FINANCE');
  assert(budgetTask?.ownerRole === 'FINANCE', 'Budget task owned by FINANCE role');

  const draftTask = planResult.tasks.find(t => t.title.includes('Draft hiring plan'));
  assert(draftTask?.department === 'TALENT', 'Draft task belongs to TALENT');
  assert(draftTask?.ownerRole === 'HR', 'Draft task owned by HR role');

  const reviewTask = planResult.tasks.find(t => t.title.includes('Submit for review'));
  assert(reviewTask?.ownerRole === 'FOUNDER', 'Submit for review owned by FOUNDER');

  // Verify all tasks link to the Plan
  const allLinked = planResult.tasks.every(t => t.planId === planResult.plan.id);
  assert(allLinked, 'All 6 tasks have planId matching the Plan ID');

  // ── [4] Idempotence ────────────────────────────────────────────────────────
  console.log('\n[4] Idempotence on Re-decomposition');

  const repeatResult = await decomposeCommandToPlan({
    startupId: companyA.startup.id,
    command,
    commandId
  });
  assert(repeatResult.plan.id === planResult.plan.id, 'Re-decomposition returns existing Plan');
  assert(repeatResult.tasks.length === 6, 'Re-decomposition returns same 6 tasks');

  const totalTasksInA = await (prisma as any).task.count({
    where: { plan: { startupId: companyA.startup.id } }
  });
  assert(totalTasksInA === 6, 'No duplicate tasks created in database on repeat run', `got ${totalTasksInA}`);

  // ── [5] Tenant Isolation & Role-Scoped Listing ─────────────────────────────
  console.log('\n[5] Tenant Isolation & Role-Scoped Listing');

  const companyAPlans = await listPlansForUser(companyA.owner.id);
  assert(companyAPlans.length === 1, 'Company A founder sees exactly 1 plan');
  assert(companyAPlans[0].tasks.length === 6, 'Company A founder sees all 6 tasks in the plan');

  const companyBPlans = await listPlansForUser(companyB.owner.id);
  assert(companyBPlans.length === 0, 'Company B founder sees 0 plans (strict tenant isolation)');

  // Company B user cannot fetch Company A's plan by ID
  await assertRejects(
    () => getPlanById(companyB.owner.id, planResult.plan.id),
    'NOT_FOUND',
    'Company B cannot access Company A plan by ID (404, no existence oracle)'
  );

  // Role scoping: HR user sees only tasks owned by HR
  const hrUser = await makeUser('hr_plan');
  await ensureMembership(hrUser.id, companyA.startup.id, 'HR');
  const hrPlans = await listPlansForUser(hrUser.id);
  assert(hrPlans.length === 1, 'HR user sees the plan');
  assert(hrPlans[0].tasks.length === 2, 'HR user sees only HR tasks (2 out of 6)', `got ${hrPlans[0].tasks.length}`);
  assert(
    hrPlans[0].tasks.every(t => t.ownerRole === 'HR'),
    'All visible tasks for HR are owned by HR'
  );

  // ── [6] End-to-End Orchestrator Execution Grounding ────────────────────────
  console.log('\n[6] End-to-End Orchestrator Command Grounding');

  const orchResponse = await orchestrationService.executeCommand(
    command,
    { userId: companyA.owner.id, startupId: companyA.startup.id }
  );

  assert(Boolean(orchResponse.plan), 'OrchestrationResponse includes explicit plan object');
  assert(
    orchResponse.plan?.title === 'Hiring Plan: Two Senior Developers',
    'Orchestrator plan title matches hiring goal'
  );
  assert(orchResponse.plan?.steps.length === 6, 'Orchestrator plan includes all 6 steps');
  assert(orchResponse.plan?.tasks.length >= 6, 'Orchestrator plan includes persisted delegated tasks');

  const answerDetails = orchResponse.answer?.details || '';
  assert(
    answerDetails.toLowerCase().includes('plan'),
    'Founder response details explicitly feature the PLAN section'
  );
  assert(
    answerDetails.includes('1.') && answerDetails.includes('Analyze current engineering capacity'),
    'Founder response details include Step 1: Analyze current engineering capacity'
  );
  assert(
    answerDetails.includes('6.') && answerDetails.includes('Submit for review'),
    'Founder response details include Step 6: Submit for review'
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
