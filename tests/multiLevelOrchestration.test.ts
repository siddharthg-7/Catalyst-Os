import { test } from 'node:test';
import assert from 'node:assert';
import { multiLevelOrchestrator } from '../backend/services/multiLevelOrchestrator';
import { companyContextService } from '../backend/services/companyContextService';
import { prisma, safeDbQuery } from '../backend/services/dbService';
import { isDbAvailable } from '../backend/state';

const TEST_USER_A = 'usr_test_orch_a';
const TEST_STARTUP_A = 'stp_test_orch_a';
const TEST_USER_B = 'usr_test_orch_b';
const TEST_STARTUP_B = 'stp_test_orch_b';

test('Multi-Level Orchestration [Test 1]: Simple Company Question (No Unnecessary DAG)', async () => {
  const directive = 'What are our current product priorities?';

  const run = await multiLevelOrchestrator.dispatchDirective({
    directive,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  assert.strictEqual(run.status, 'completed', 'Simple question must complete successfully');
  assert.strictEqual(run.intent, 'knowledge_query', 'Classified as knowledge query');
  assert.strictEqual(run.tasks.length, 0, 'Simple question must avoid launching multi-agent DAG');
  assert.ok(run.result.summary.length > 0, 'Must produce a valid summary');
  assert.ok(run.result.completedWork.some(w => w.includes('Avoided launching unnecessary multi-agent DAG')), 'Must indicate avoided unnecessary DAG');
  console.log('✅ PASS: Test 1 - Simple company question answered directly without multi-agent DAG');
});

test('Multi-Level Orchestration [Test 2]: Multi-Domain Directive (Parallel Execution & Dependencies)', async () => {
  const directive = 'Prepare a 30-day go-to-market plan and assess the budget.';

  const run = await multiLevelOrchestrator.dispatchDirective({
    directive,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  assert.strictEqual(run.status, 'completed', 'Directive should complete successfully');
  assert.strictEqual(run.intent, 'cross_domain_directive', 'Must classify as cross-domain directive');
  assert.ok(run.plan, 'Must produce a structured DAG plan');
  assert.strictEqual(run.tasks.length, 4, 'Must create 4 DAG tasks');

  // Verify task dependencies
  const researchTask = run.tasks.find(t => t.id === 'step_market_research');
  const budgetTask = run.tasks.find(t => t.id === 'step_budget_analysis');
  const launchTask = run.tasks.find(t => t.id === 'step_launch_strategy');

  assert.ok(researchTask, 'Market research task exists');
  assert.ok(budgetTask, 'Budget analysis task exists');
  assert.ok(launchTask, 'Launch strategy task exists');

  assert.deepStrictEqual(researchTask?.dependsOn, [], 'Market research has no prerequisites (runs in parallel)');
  assert.deepStrictEqual(budgetTask?.dependsOn, [], 'Budget analysis has no prerequisites (runs in parallel)');
  assert.ok(launchTask?.dependsOn.includes('step_market_research'), 'Launch strategy depends on market research');
  assert.ok(launchTask?.dependsOn.includes('step_budget_analysis'), 'Launch strategy depends on budget analysis');

  // Verify all steps completed
  assert.strictEqual(researchTask?.status, 'completed');
  assert.strictEqual(budgetTask?.status, 'completed');
  assert.strictEqual(launchTask?.status, 'completed');

  // Verify aggregated result
  assert.ok(run.result.summary.length > 0, 'Summary exists');
  assert.ok(run.result.completedWork.length >= 3, 'Completed work contains executed steps');
  console.log('✅ PASS: Test 2 - Multi-domain directive executes concurrent prerequisites and resolves dependencies');
});

test('Multi-Level Orchestration [Test 3]: Real Task Creation (Persistent Records Returned)', async () => {
  const directive = 'Create three tasks from this approved product plan.';

  const run = await multiLevelOrchestrator.dispatchDirective({
    directive,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  assert.strictEqual(run.status, 'completed', 'Task creation should complete');
  assert.strictEqual(run.intent, 'task_creation', 'Classified as task_creation');
  assert.ok(run.createdRecords.tasks, 'Tasks array must exist in createdRecords');
  assert.strictEqual(run.createdRecords.tasks?.length, 3, 'Must create 3 tasks');

  // Verify returned records contain actual task IDs
  const createdTasks = run.createdRecords.tasks!;
  createdTasks.forEach(t => {
    assert.ok(t.id.startsWith('task_'), `Task ID '${t.id}' must be valid`);
    assert.ok(t.title.length > 0, 'Task must have a non-empty title');
    assert.ok(t.assignedTo.length > 0, 'Task must have an assigned owner');
  });

  console.log('✅ PASS: Test 3 - Task creation created verified persistent task records');
});

test('Multi-Level Orchestration [Test 4]: Missing / Unsupported Capability (No Fake Outputs)', async () => {
  const directive = 'Execute a capability that is not installed or supported.';

  const run = await multiLevelOrchestrator.dispatchDirective({
    directive,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  assert.strictEqual(run.intent, 'unsupported_capability', 'Classified as unsupported capability');
  
  // Verify that unsupported task failed and did not invent fake output
  const unsupportedTask = run.tasks.find(t => t.id === 'step_unsupported_execution');
  assert.ok(unsupportedTask, 'Unsupported task step was defined in DAG');
  assert.strictEqual(unsupportedTask.status, 'failed', 'Unsupported task must fail explicitly');
  assert.ok(unsupportedTask.error?.includes('not installed or supported'), 'Error must explicitly state capability is not installed or supported');
  assert.ok(run.result.failedOrBlockedSteps.length > 0, 'Result must report failed steps truthfully');
  console.log('✅ PASS: Test 4 - Unsupported capability was truthfully reported without hallucinated agents');
});

test('Multi-Level Orchestration [Test 5]: Tenant Isolation and Authorization', async () => {
  // Create a run for Tenant A
  const runA = await multiLevelOrchestrator.dispatchDirective({
    directive: 'Prepare a 30-day go-to-market plan and assess the budget.',
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  // Access by Tenant A succeeds
  const retrievedA = multiLevelOrchestrator.getRun(runA.runId, TEST_STARTUP_A);
  assert.ok(retrievedA, 'Tenant A can retrieve their own run');
  assert.strictEqual(retrievedA.runId, runA.runId);

  // Cross-tenant access by Tenant B is strictly blocked
  const retrievedB = multiLevelOrchestrator.getRun(runA.runId, TEST_STARTUP_B);
  assert.strictEqual(retrievedB, null, 'Tenant B is blocked from reading Tenant A run (Tenant Isolation)');

  const tasksB = multiLevelOrchestrator.getRunTasks(runA.runId, TEST_STARTUP_B);
  assert.strictEqual(tasksB, null, 'Tenant B is blocked from reading Tenant A tasks');

  console.log('✅ PASS: Test 5 - Tenant isolation enforced, cross-tenant access blocked');
});

test('Multi-Level Orchestration [Test 6]: Failure Handling & Dependent Task Blocking', async () => {
  const customPlan = multiLevelOrchestrator.generateDagPlan(
    'Test failure cascading',
    'unsupported_capability',
    'Test cascading block on prerequisite failure',
    {
      startupId: TEST_STARTUP_A,
      userId: TEST_USER_A,
      startup: { name: 'Test Co' },
      financials: { cashBalance: 100000, monthlyBurn: 10000, runwayMonths: 10 }
    } as any
  );

  // Add a dependent task that depends on the unsupported task
  customPlan.steps.push({
    id: 'step_dependent_after_unsupported',
    stepNumber: 3,
    title: 'Downstream task depending on unsupported step',
    domain: 'operations',
    capability: 'product_planning',
    assignedAgent: { role: 'Operations', name: 'Helix', avatar: '', domain: 'operations' },
    dependsOn: ['step_unsupported_execution'],
    expectedOutput: 'Should never run because prerequisite fails',
    status: 'planned'
  });

  const run: any = {
    runId: `run_failure_test_${Date.now()}`,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A,
    directive: 'Test failure cascading',
    intent: 'unsupported_capability',
    objective: 'Test failure',
    status: 'running',
    currentPhase: 'Testing',
    plan: customPlan,
    tasks: customPlan.steps,
    createdRecords: {},
    result: { summary: '', completedWork: [], keyFindings: [], calculations: [], assumptions: [], createdRecords: [], failedOrBlockedSteps: [], founderDecisions: [], recommendedActions: [], evidence: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await multiLevelOrchestrator.executeDag(run, {
    startupId: TEST_STARTUP_A,
    userId: TEST_USER_A,
    startup: { name: 'Test Co' },
    financials: { cashBalance: 100000, monthlyBurn: 10000, runwayMonths: 10 }
  } as any);

  const dependentTask = run.tasks.find((t: any) => t.id === 'step_dependent_after_unsupported');
  assert.strictEqual(dependentTask.status, 'blocked', 'Dependent task must be BLOCKED when prerequisite fails');
  assert.ok(dependentTask.error?.includes('Blocked because prerequisite'), 'Reason must indicate prerequisite failure');

  console.log('✅ PASS: Test 6 - Prerequisite failure correctly blocked dependent downstream tasks');
});

test('Multi-Level Orchestration [Test 7]: Consequential Action & Approval Workflow', async () => {
  const directive = 'Authorize hiring a senior platform engineer.';

  const run = await multiLevelOrchestrator.dispatchDirective({
    directive,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  assert.strictEqual(run.status, 'needs_approval', 'Consequential hiring action must transition to needs_approval');
  assert.ok(run.createdRecords.approvals, 'Approval record must be created');
  assert.strictEqual(run.createdRecords.approvals?.length, 1, 'Exactly 1 approval created');

  const approval = run.createdRecords.approvals![0];
  assert.ok(approval.id.startsWith('appr_'), 'Approval ID must be formatted properly');
  assert.ok(approval.title.includes('Headcount') || approval.title.includes('Authorize'), 'Approval title must be descriptive');
  assert.ok(run.result.founderDecisions.length > 0, 'Result must explicitly demand founder review');

  console.log('✅ PASS: Test 7 - Consequential action gated with genuine approval requirement');
});

test('Multi-Level Orchestration [Test 8]: Active Run Cancellation', async () => {
  const run = await multiLevelOrchestrator.dispatchDirective({
    directive: 'Prepare a 30-day go-to-market plan and assess the budget.',
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A
  });

  // Simulate an in-flight run
  const inFlightRunId = `run_cancel_test_${Date.now()}`;
  const inFlightRun: any = {
    runId: inFlightRunId,
    userId: TEST_USER_A,
    startupId: TEST_STARTUP_A,
    directive: 'Long running directive',
    intent: 'cross_domain_directive',
    objective: 'Cancel test',
    status: 'running',
    currentPhase: 'Running',
    plan: null,
    tasks: [],
    createdRecords: {},
    result: { summary: '', completedWork: [], keyFindings: [], calculations: [], assumptions: [], createdRecords: [], failedOrBlockedSteps: [], founderDecisions: [], recommendedActions: [], evidence: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  (multiLevelOrchestrator as any).activeRuns.set(inFlightRunId, inFlightRun);

  const cancelled = multiLevelOrchestrator.cancelRun(inFlightRunId, TEST_STARTUP_A);
  assert.strictEqual(cancelled, true, 'Cancellation of active run must succeed');
  assert.strictEqual(inFlightRun.status, 'cancelled', 'Run status updated to cancelled');

  console.log('✅ PASS: Test 8 - Run cancellation successfully handled');
});
