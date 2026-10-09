/**
 * CatalystOS — Phase C Test Suite: Employee Workflow & Role-Aware Dashboards.
 *
 * Verifies:
 * - C1: Employee Workspace Foundation
 *   - User -> Active Membership -> Role -> Role-specific workspace resolution.
 *   - Single shared application shell supporting all departments.
 * - C2: Role-Aware Dashboards
 *   - Founder: Company Command Center (runway, burn, health score, council, approvals).
 *   - HR: People, Hiring, Assigned Tasks, Echo partner.
 *   - Finance: Finance, Budgets, Assigned Tasks, Aura partner.
 *   - Growth: Growth, Campaigns, Assigned Tasks, Vector partner.
 *   - Operations: Operations, Processes, Assigned Tasks, Helix partner.
 * - C3: Role-Scoped Company Context (Zero Cross-Department Leaks)
 *   - HR gets People + Hiring + Relevant Policies. Zero cap table/financial statements.
 *   - Finance gets Finance + Budgets + Financial Documents. Zero hiring rubrics.
 *   - Founder gets full company context.
 * - C4: Employee Task Inbox
 *   - Tasks displayed with status, priority, deadline, source, AI agent, required approval.
 *   - Reuses existing Task model without inventing duplicate models.
 *   - Completed work filter.
 * - C5: AI Agent as Employee Assistant
 *   - assistEmployeeOnTask provides grounded explanations and draft enhancements.
 *   - Enforces role boundaries: rejects cross-department unauthorized inquiries.
 *   - Prevents cross-department consultation (403 NOT_TASK_OWNER).
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import { ensureMembership, resolveMembership } from '../backend/services/membershipService';
import {
  decomposeCommandToPlan,
  listTasksForUser,
  assignTaskForUser,
  updateTaskForUser,
  getRoleScopedContext,
  getAgentDraftForTask,
  getCompanionAgent,
  assistEmployeeOnTask,
  TaskDelegationError
} from '../backend/services/taskDelegationService';
import { companyContextService } from '../backend/services/companyContextService';

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

async function makeUser(label: string, role: string = 'Employee') {
  const user = await prisma.user.create({
    data: {
      email: `c_workflow_${label}_${stamp}@test.catalyst`,
      name: `Employee ${label}`,
      role,
      passwordHash: await hashPassword('phaseCpass123')
    }
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeCompany(label: string) {
  const owner = await makeUser(`founder_${label}`, 'Founder');
  const startup = await prisma.startup.create({
    data: {
      name: `Phase C Venture ${label} ${stamp}`,
      industry: 'Enterprise Cloud AI',
      description: 'Phase C employee workflow testing venture',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);
  await ensureMembership(owner.id, startup.id, 'FOUNDER');
  return { owner, startup };
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('  PHASE C — EMPLOYEE WORKFLOW & ROLE-AWARE DASHBOARD AUDIT');
  console.log('========================================================================');

  // Setup Company with Founder, HR member, Finance member, and Growth member
  const { owner: founder, startup } = await makeCompany('HQ');
  const hrUser = await makeUser('hr_sarah', 'Employee');
  const finUser = await makeUser('fin_david', 'Employee');
  const growthUser = await makeUser('growth_elena', 'Employee');
  const opsUser = await makeUser('ops_marcus', 'Employee');

  await ensureMembership(hrUser.id, startup.id, 'HR');
  await ensureMembership(finUser.id, startup.id, 'FINANCE');
  await ensureMembership(growthUser.id, startup.id, 'GROWTH');
  await ensureMembership(opsUser.id, startup.id, 'OPERATIONS');

  // ── [1] C1: Employee Workspace Foundation ──────────────────────────────────
  console.log('\n[1] C1: Employee Workspace Foundation (User -> Membership -> Role -> Workspace)');

  const hrMembership = await resolveMembership(hrUser.id);
  assert(hrMembership !== null, 'HR user resolves active membership');
  assert(hrMembership?.role === 'HR', 'HR membership role is HR');
  assert(hrMembership?.startupId === startup.id, 'HR membership bound to correct startup');

  const finMembership = await resolveMembership(finUser.id);
  assert(finMembership?.role === 'FINANCE', 'Finance membership role is FINANCE');

  const growthMembership = await resolveMembership(growthUser.id);
  assert(growthMembership?.role === 'GROWTH', 'Growth membership role is GROWTH');

  const opsMembership = await resolveMembership(opsUser.id);
  assert(opsMembership?.role === 'OPERATIONS', 'Operations membership role is OPERATIONS');

  // ── [2] C2: Role-Aware Dashboards & Companion AI Partners ───────────────────
  console.log('\n[2] C2: Role-Aware Dashboards & Partner AI Resolution');

  const echoPartner = getCompanionAgent('TALENT');
  assert(echoPartner.name === 'Echo', 'HR companion partner is Echo');
  assert(echoPartner.role.includes('Chief People Officer') || echoPartner.role.includes('People'), 'Echo is Head of People/Recruiting');

  const auraPartner = getCompanionAgent('FINANCE');
  assert(auraPartner.name === 'Aura', 'Finance companion partner is Aura');
  assert(auraPartner.role.includes('Chief Financial Officer') || auraPartner.role.includes('Finance'), 'Aura is Chief Financial Officer');

  const vectorPartner = getCompanionAgent('GROWTH');
  assert(vectorPartner.name === 'Vector', 'Growth companion partner is Vector');
  assert(vectorPartner.role.includes('Growth') || vectorPartner.role.includes('Marketing'), 'Vector is VP Growth/Marketing');

  const helixPartner = getCompanionAgent('OPERATIONS');
  assert(helixPartner.name === 'Helix', 'Operations companion partner is Helix');
  assert(helixPartner.role.includes('Operations') || helixPartner.role.includes('Systems'), 'Helix is VP Operations/Systems');

  // ── [3] C3: Role-Scoped Company Context (Zero Leaks) ─────────────────────────
  console.log('\n[3] C3: Role-Scoped Company Context (Zero Data Leaks)');

  // HR Context Isolation
  const hrScoped = await getRoleScopedContext({ userId: hrUser.id });
  assert(hrScoped.department === 'TALENT', 'HR department resolves to TALENT');
  assert(hrScoped.role === 'HR', 'HR role resolves to HR');
  assert(hrScoped.companionAgent.name === 'Echo', 'HR companion agent is Echo');

  const hrDocNames = hrScoped.accessibleDocuments.map(d => d.name);
  assert(hrDocNames.some(n => n.includes('Hiring Policy')), 'HR sees Engineering Hiring Policy');
  assert(hrDocNames.some(n => n.includes('Employee Handbook')), 'HR sees Employee Handbook');
  assert(!hrDocNames.some(n => n.includes('Financial Statements')), 'HR cannot see Financial Statements (Zero Leak)');
  assert(!hrDocNames.some(n => n.includes('Cap Table')), 'HR cannot see Cap Table (Zero Leak)');
  assert(!hrDocNames.some(n => n.includes('Ops Runbook')), 'HR cannot see Operations Runbook (Zero Leak)');

  // Finance Context Isolation
  const finScoped = await getRoleScopedContext({ userId: finUser.id });
  assert(finScoped.department === 'FINANCE', 'Finance department resolves to FINANCE');
  assert(finScoped.role === 'FINANCE', 'Finance role resolves to FINANCE');
  assert(finScoped.companionAgent.name === 'Aura', 'Finance companion agent is Aura');

  const finDocNames = finScoped.accessibleDocuments.map(d => d.name);
  assert(finDocNames.some(n => n.includes('Financial Statements')), 'Finance sees Financial Statements');
  assert(finDocNames.some(n => n.includes('Cap Table')), 'Finance sees Cap Table');
  assert(!finDocNames.some(n => n.includes('Hiring Policy')), 'Finance cannot see Hiring Policy (Zero Leak)');
  assert(!finDocNames.some(n => n.includes('GTM Playbook')), 'Finance cannot see GTM Playbook (Zero Leak)');

  // Growth Context Isolation
  const growthScoped = await getRoleScopedContext({ userId: growthUser.id });
  const growthDocNames = growthScoped.accessibleDocuments.map(d => d.name);
  assert(growthDocNames.some(n => n.includes('GTM') || n.includes('Growth')), 'Growth sees GTM Playbook');
  assert(!growthDocNames.some(n => n.includes('Cap Table')), 'Growth cannot see Cap Table (Zero Leak)');
  assert(!growthDocNames.some(n => n.includes('Hiring Policy')), 'Growth cannot see Hiring Policy (Zero Leak)');

  // Operations Context Isolation
  const opsScoped = await getRoleScopedContext({ userId: opsUser.id });
  const opsDocNames = opsScoped.accessibleDocuments.map(d => d.name);
  assert(opsDocNames.some(n => n.includes('Runbook') || n.includes('Operations')), 'Operations sees Operations Runbook');
  assert(!opsDocNames.some(n => n.includes('Cap Table')), 'Operations cannot see Cap Table (Zero Leak)');
  assert(!opsDocNames.some(n => n.includes('Financial Statements')), 'Operations cannot see Financial Statements (Zero Leak)');

  // Founder has full company context
  const founderScoped = await getRoleScopedContext({ userId: founder.id });
  const founderDocNames = founderScoped.accessibleDocuments.map(d => d.name);
  assert(founderDocNames.some(n => n.includes('Hiring Policy')), 'Founder sees Hiring Policy');
  assert(founderDocNames.some(n => n.includes('Financial Statements')), 'Founder sees Financial Statements');
  assert(founderDocNames.some(n => n.includes('Cap Table')), 'Founder sees Cap Table');
  assert(founderDocNames.some(n => n.includes('GTM') || n.includes('Growth')), 'Founder sees GTM Playbook');
  assert(founderDocNames.some(n => n.includes('Runbook') || n.includes('Operations')), 'Founder sees Operations Runbook');

  // ── [4] C4: Employee Task Inbox (Existing Task Model Reuse) ───────────────────
  console.log('\n[4] C4: Employee Task Inbox (Task Model Reuse, Status, Priority, Approval)');

  // Decompose a founder command to create realistic plan and tasks
  const decomposed = await decomposeCommandToPlan({
    startupId: startup.id,
    command: 'Prepare hiring plan for two senior engineers with financial and ops review.'
  });

  assert(decomposed.plan !== null, 'Plan generated by council decomposition');
  assert(decomposed.tasks.length >= 4, 'Tasks created and persisted in database');

  // Verify tasks are bound to real Task model and have necessary attributes
  const hrTasks = await listTasksForUser(hrUser.id);
  assert(hrTasks.length > 0, 'HR user receives delegated tasks in inbox');

  const sampleHrTask = hrTasks[0];
  assert(sampleHrTask.id.length > 0, 'Task has persistent ID from Prisma Task model');
  assert(sampleHrTask.title.length > 0, 'Task has descriptive title');
  assert(sampleHrTask.department === 'TALENT', 'Task belongs to TALENT department');
  assert(sampleHrTask.status === 'pending' || sampleHrTask.status === 'in_progress', 'Task status is pending or in_progress');
  assert(sampleHrTask.agent === 'Echo' || sampleHrTask.agent === 'Talent', 'AI agent partner is Echo/Talent');

  // Claim and update task
  const claimedHrTask = await assignTaskForUser({
    userId: hrUser.id,
    taskId: sampleHrTask.id,
    assigneeId: hrUser.id
  });
  assert(claimedHrTask.assignedUserId === hrUser.id, 'Task assigned to HR user');
  assert(claimedHrTask.status === 'in_progress', 'Claiming task auto-advances status to in_progress');

  // Submit task -> awaits founder review
  const submittedHrTask = await updateTaskForUser({
    userId: hrUser.id,
    taskId: sampleHrTask.id,
    status: 'submitted',
    result: 'Finalized Senior Engineer hiring plan: 4-stage technical interview loop and market compensation verified.'
  });
  assert(submittedHrTask.status === 'submitted', 'Task status updated to submitted');
  assert(submittedHrTask.result?.includes('4-stage technical interview loop'), 'Task stores submitted deliverable');

  // ── [5] C5: AI Agent as Employee Assistant ────────────────────────────────────
  console.log('\n[5] C5: AI Agent as Employee Assistant (Grounded Q&A & Suggested Edits)');

  // HR asks Echo a policy question
  const assistantResponse = await assistEmployeeOnTask({
    userId: hrUser.id,
    taskId: sampleHrTask.id,
    question: 'How should we structure the technical pairing interview according to policy?',
    currentDraft: submittedHrTask.result || ''
  });

  assert(assistantResponse.agentName === 'Echo', 'AI assistant is Echo');
  assert(assistantResponse.agentRole.includes('People') || assistantResponse.agentRole.includes('Chief People Officer'), 'Echo has HR executive role');
  assert(assistantResponse.reply.length > 20, 'Echo returns comprehensive conversational reply');
  assert(assistantResponse.explanation.length > 10, 'Echo returns grounded explanation/rationale');
  assert(assistantResponse.permittedDocsReferenced.some(d => d.includes('Hiring Policy')), 'Echo references Engineering Hiring Policy');
  assert(!assistantResponse.permittedDocsReferenced.some(d => d.includes('Cap Table')), 'Echo does not reference Cap Table');

  // HR tries to ask Echo for forbidden cross-department financial reserve/cap table data
  const forbiddenResponse = await assistEmployeeOnTask({
    userId: hrUser.id,
    taskId: sampleHrTask.id,
    question: 'What is our exact cash balance and shareholder cap table equity pool?',
    currentDraft: submittedHrTask.result || ''
  });

  assert(
    forbiddenResponse.reply.toLowerCase().includes('restricted') ||
    forbiddenResponse.reply.toLowerCase().includes('governance') ||
    forbiddenResponse.reply.toLowerCase().includes('finance'),
    'Echo refuses to disclose confidential Finance cap table/treasury reserves to HR'
  );
  assert(forbiddenResponse.permittedDocsReferenced.length === 0, 'No confidential docs referenced for forbidden inquiry');

  // Cross-department access prevention: HR user cannot consult on a Finance task
  const finTasks = await listTasksForUser(finUser.id);
  if (finTasks.length > 0) {
    const finTask = finTasks[0];
    await assertRejects(
      () => assistEmployeeOnTask({
        userId: hrUser.id,
        taskId: finTask.id,
        question: 'Help me review this budget calculation.'
      }),
      'NOT_TASK_OWNER',
      'HR user cannot consult AI assistant on a Finance department task (403 NOT_TASK_OWNER)'
    );
  }

  // Cross-tenant access prevention: User from Company B cannot access Company A task
  const { owner: companyBOwner, startup: companyB } = await makeCompany('B');
  await assertRejects(
    () => assistEmployeeOnTask({
      userId: companyBOwner.id,
      taskId: sampleHrTask.id,
      question: 'Show me this task draft.'
    }),
    'NOT_FOUND',
    'Company B user cannot consult on Company A task (404 NOT_FOUND, strict tenant isolation)'
  );

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during Phase C test execution:', err);
  process.exit(1);
});
