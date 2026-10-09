/**
 * CatalystOS — Phase B1 & B2 test suite:
 * Human Task Assignment/Claiming & Dedicated Employee Workspace Surface.
 *
 * Verifies:
 * - Phase B1:
 *   - Human task assignment by Founder/Admin.
 *   - Human task claiming by department employees (HR, FINANCE, GROWTH, OPERATIONS).
 *   - Strict cross-department claim prevention (403 NOT_TASK_OWNER).
 *   - Employee cannot assign tasks to others (403 ASSIGNMENT_FORBIDDEN).
 *   - Status auto-advances to in_progress upon claiming.
 *   - Task unassignment by Founder/Admin.
 * - Phase B2:
 *   - Companion executive AI draft retrieval (Echo for HR, Aura for Finance, etc.).
 *   - Strict role-scoped document isolation (Zero cross-department leaks).
 *   - Employee edits & submits deliverable -> auto-creates Founder Approval item.
 *   - Founder approves/rejects deliverable -> task status updates to approved/rejected.
 *   - Multi-tenant boundary isolation.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import { ensureMembership } from '../backend/services/membershipService';
import {
  decomposeCommandToPlan,
  listTasksForUser,
  assignTaskForUser,
  updateTaskForUser,
  getRoleScopedContext,
  getAgentDraftForTask,
  getCompanionAgent,
  generateAgentDraftContent,
  TaskDelegationError
} from '../backend/services/taskDelegationService';
import { approvalService } from '../backend/services/approvalService';

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

async function makeUser(label: string, role: string = 'Founder') {
  const user = await prisma.user.create({
    data: {
      email: `b1b2_${label}_${stamp}@test.catalyst`,
      name: `B1B2 ${label}`,
      role,
      passwordHash: await hashPassword('b1b2pass123')
    }
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeCompany(label: string) {
  const owner = await makeUser(`owner_${label}`);
  const startup = await prisma.startup.create({
    data: {
      name: `B1B2 Co ${label} ${stamp}`,
      industry: 'Enterprise Software',
      description: 'Phase B1/B2 delegation loop test venture',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);
  await ensureMembership(owner.id, startup.id, 'FOUNDER');
  return { owner, startup };
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('  PHASE B1 & B2 — HUMAN TASK ASSIGNMENT & EMPLOYEE WORKSPACE');
  console.log('========================================================================');

  // Setup Company A with Founder, HR member, and Finance member
  const { owner: founderA, startup: startupA } = await makeCompany('A');
  const hrUser = await makeUser('hr_alice', 'Executive');
  await ensureMembership(hrUser.id, startupA.id, 'HR');

  const finUser = await makeUser('fin_bob', 'Executive');
  await ensureMembership(finUser.id, startupA.id, 'FINANCE');

  // Setup Company B with Founder and HR member
  const { owner: founderB, startup: startupB } = await makeCompany('B');
  const hrUserB = await makeUser('hr_charlie', 'Executive');
  await ensureMembership(hrUserB.id, startupB.id, 'HR');

  // Decompose a hiring command in Company A
  const planA = await decomposeCommandToPlan({
    startupId: startupA.id,
    command: 'Prepare a hiring plan for two senior developers.'
  });

  const talentTasks = planA.tasks.filter(t => t.department === 'TALENT');
  const financeTasks = planA.tasks.filter(t => t.department === 'FINANCE');

  assert(talentTasks.length >= 2, 'Company A has at least 2 TALENT tasks');
  assert(financeTasks.length >= 1, 'Company A has at least 1 FINANCE task');

  const hrTask = talentTasks[0];
  const finTask = financeTasks[0];

  // ── [1] Phase B1: Human Task Assignment & Claiming ─────────────────────────
  console.log('\n[1] Phase B1: Human Task Claiming & Role Authorization');

  // HR user claims their department's TALENT task
  const claimedHrTask = await assignTaskForUser({
    userId: hrUser.id,
    taskId: hrTask.id
  });

  assert(claimedHrTask.assignedUserId === hrUser.id, 'HR user successfully claimed TALENT task');
  assert(claimedHrTask.assignedUserName?.includes('hr_alice'), 'Claimed task resolves assignedUserName');
  assert(claimedHrTask.status === 'in_progress', 'Claiming pending task advances status to in_progress');
  assert(claimedHrTask.needsHumanOwner === false, 'Claimed task no longer needs human owner');

  // HR user attempts to claim FINANCE task -> 403 NOT_TASK_OWNER
  await assertRejects(
    () => assignTaskForUser({ userId: hrUser.id, taskId: finTask.id }),
    'NOT_TASK_OWNER',
    'HR user cannot claim a FINANCE department task (403 NOT_TASK_OWNER)'
  );

  // HR user attempts to assign their task to Finance user -> 403 ASSIGNMENT_FORBIDDEN
  await assertRejects(
    () => assignTaskForUser({ userId: hrUser.id, taskId: hrTask.id, assigneeId: finUser.id }),
    'ASSIGNMENT_FORBIDDEN',
    'Employee cannot assign tasks to other colleagues (403 ASSIGNMENT_FORBIDDEN)'
  );

  // Founder can assign any task to any member
  console.log('\n[2] Phase B1: Founder Assignment & Unassignment');
  const founderAssignedFinTask = await assignTaskForUser({
    userId: founderA.id,
    taskId: finTask.id,
    assigneeId: finUser.id
  });

  assert(founderAssignedFinTask.assignedUserId === finUser.id, 'Founder successfully assigned FINANCE task to finUser');
  assert(founderAssignedFinTask.needsHumanOwner === false, 'Founder-assigned task has needsHumanOwner false');

  // Founder can unassign a task
  const unassignedFinTask = await assignTaskForUser({
    userId: founderA.id,
    taskId: finTask.id,
    assigneeId: null
  });
  assert(unassignedFinTask.assignedUserId === null, 'Founder can unassign task back to role pool');
  assert(unassignedFinTask.ownerRole === 'FINANCE', 'Unassigned task retains ownerRole FINANCE');

  // ── [3] Phase B2: Companion Executive Agent & Draft Generation ──────────────
  console.log('\n[3] Phase B2: Companion AI Executive Drafts');

  const echoAgent = getCompanionAgent('TALENT');
  assert(echoAgent.name === 'Echo', 'Talent companion agent is Echo');
  assert(echoAgent.role.includes('Chief People Officer'), 'Echo has CPO executive title');

  const auraAgent = getCompanionAgent('FINANCE');
  assert(auraAgent.name === 'Aura', 'Finance companion agent is Aura');
  assert(auraAgent.role.includes('Chief Financial Officer'), 'Aura has CFO executive title');

  const draftData = generateAgentDraftContent(hrTask, 'Catalyst Venture');
  assert(draftData.draftContent.includes('Candidate Persona'), 'Echo draft includes Candidate Persona');
  assert(draftData.draftContent.includes('Four-Stage Interview Loop'), 'Echo draft includes 4-stage interview loop');
  assert(draftData.draftContent.includes('90-Day Onboarding Plan'), 'Echo draft includes 90-day onboarding milestones');
  assert(draftData.guidelines.length > 0, 'Echo draft provides actionable guidelines');

  // HR user fetches draft via getAgentDraftForTask
  const taskDraftResponse = await getAgentDraftForTask(hrUser.id, hrTask.id);
  assert(taskDraftResponse.companionAgent.name === 'Echo', 'getAgentDraftForTask returns Echo for HR task');
  assert(taskDraftResponse.draftContent.length > 100, 'getAgentDraftForTask returns comprehensive draft content');

  // Cross-department draft request prevention
  await assertRejects(
    () => getAgentDraftForTask(hrUser.id, finTask.id),
    'NOT_TASK_OWNER',
    'HR user cannot access draft for FINANCE task (403 NOT_TASK_OWNER)'
  );

  // ── [4] Phase B2: Role-Scoped Context & Document Isolation ─────────────────
  console.log('\n[4] Phase B2: Role-Scoped Document Isolation (Zero Leaks)');

  const hrContext = await getRoleScopedContext({ userId: hrUser.id });
  assert(hrContext.companionAgent.name === 'Echo', 'HR workspace companion agent is Echo');
  assert(hrContext.accessibleDocuments.length > 0, 'HR workspace has accessible documents');

  const hrDocNames = hrContext.accessibleDocuments.map(d => d.name);
  assert(hrDocNames.some(n => n.includes('Hiring Policy')), 'HR sees Engineering Hiring Policy');
  assert(hrDocNames.some(n => n.includes('Employee Handbook')), 'HR sees Employee Handbook');
  assert(!hrDocNames.some(n => n.includes('Financial Statements')), 'HR cannot see Financial Statements (Zero Leak)');
  assert(!hrDocNames.some(n => n.includes('Cap Table')), 'HR cannot see Cap Table (Zero Leak)');

  const finContext = await getRoleScopedContext({ userId: finUser.id });
  const finDocNames = finContext.accessibleDocuments.map(d => d.name);
  assert(finDocNames.some(n => n.includes('Financial Statements')), 'Finance sees Financial Statements');
  assert(finDocNames.some(n => n.includes('Cap Table')), 'Finance sees Cap Table');
  assert(!finDocNames.some(n => n.includes('Hiring Policy')), 'Finance cannot see Engineering Hiring Policy (Zero Leak)');

  // ── [5] Phase B2: Edit, Submit & Founder Approval Cycle ─────────────────────
  console.log('\n[5] Phase B2: Employee Submit -> Founder Approval Cycle');

  const deliverableText = 'Finalized candidate persona for 2 Senior Engineers: 4-stage technical loop with Bar Raiser. Verified compensation at 75th percentile.';
  
  // HR user submits the completed deliverable
  const submittedTask = await updateTaskForUser({
    userId: hrUser.id,
    taskId: hrTask.id,
    status: 'submitted',
    result: deliverableText
  });

  assert(submittedTask.status === 'submitted', 'Task status is submitted');
  assert(submittedTask.result === deliverableText, 'Submitted deliverable text is stored');

  // Verify that an Approval row was automatically created for the Founder
  const expectedApprovalId = `appr_task_${hrTask.id}`;
  const approvalRow = await prisma.approval.findUnique({
    where: { id: expectedApprovalId }
  });

  assert(Boolean(approvalRow), 'Founder approval item automatically created in database');
  assert(approvalRow?.status === 'pending_review', 'Approval item is in pending_review state');
  assert(approvalRow?.description === deliverableText, 'Approval description matches submitted deliverable');

  // Founder reviews and approves the deliverable
  const reviewResult = await approvalService.reviewApproval({
    approvalId: expectedApprovalId,
    userId: founderA.id,
    action: 'approve',
    feedback: 'Approved by founder. Excellent candidate leveling.'
  });

  assert(reviewResult.success === true, 'Founder approval completed successfully');

  // Verify that the task status in database transitioned to 'approved'
  const postApprovalTask = await prisma.task.findUnique({
    where: { id: hrTask.id }
  });
  assert(postApprovalTask?.status === 'approved', 'Task status automatically updated to approved');

  // ── [6] Multi-tenant Isolation ─────────────────────────────────────────────
  console.log('\n[6] Multi-tenant Isolation: Company B vs Company A');

  // Company B HR user cannot see Company A tasks
  const bTasks = await listTasksForUser(hrUserB.id);
  assert(bTasks.length === 0, 'Company B HR user sees 0 tasks before any Company B delegation');

  // Company B HR user cannot claim Company A task
  await assertRejects(
    () => assignTaskForUser({ userId: hrUserB.id, taskId: hrTask.id }),
    'NOT_FOUND',
    'Company B user attempting to claim Company A task returns 404 NOT_FOUND'
  );

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  // Cleanup fixtures
  try {
    for (const sid of createdStartupIds) {
      await prisma.startup.delete({ where: { id: sid } }).catch(() => {});
    }
    for (const uid of createdUserIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
  } catch (err: any) {
    console.warn('Cleanup note:', err.message);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
