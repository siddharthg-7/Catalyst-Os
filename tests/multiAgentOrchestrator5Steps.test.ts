import { test } from 'node:test';
import assert from 'node:assert';
import { multiAgentOrchestratorService } from '../backend/services/multiAgentOrchestratorService';

test('Multi-Agent 5-Step Orchestration: Step 1, 2, 3A & 3B Resource Allocation', async () => {
  const projectInput = 'We need an email marketing system with a React dashboard and a secure Python SMTP background processing worker.';

  const assessment = await multiAgentOrchestratorService.orchestrateTask({
    userRequirement: projectInput,
    startupId: 'test_startup_orch_5steps'
  });

  // Verify Assessment Output Structure
  assert.ok(assessment.id, 'Assessment must produce a unique assessment ID');
  assert.strictEqual(assessment.totalDomains, 2, 'Must decompose into 2 domains: Frontend and Python Backend');

  // Verify Step 1: Agent Selection
  const frontendAlloc = assessment.allocations.find(a => 
    multiAgentOrchestratorService.matchDomain(a.requiredDomain, 'Frontend')
  );
  const backendAlloc = assessment.allocations.find(a => 
    multiAgentOrchestratorService.matchDomain(a.requiredDomain, 'Python Backend')
  );

  assert.ok(frontendAlloc, 'Frontend domain allocation must exist');
  assert.ok(backendAlloc, 'Python Backend domain allocation must exist');
  assert.ok(frontendAlloc.assignedAgent.name.includes('Designer') || frontendAlloc.assignedAgent.role.includes('Frontend'), 'Frontend agent assigned');
  assert.ok(backendAlloc.assignedAgent.name.includes('Backend') || backendAlloc.assignedAgent.role.includes('Backend'), 'Backend agent assigned');

  // Verify Step 2 & 3A: Case A (Worker is Available - Aman)
  assert.strictEqual(frontendAlloc.status, 'ASSIGNED', 'Frontend worker Aman must be ASSIGNED');
  assert.ok(frontendAlloc.assignedWorker, 'Frontend has an assigned worker');
  assert.strictEqual(frontendAlloc.assignedWorker?.name, 'Aman', 'Assigned worker must be Aman');
  assert.strictEqual(frontendAlloc.assignedWorker?.status, 'Available', 'Worker status must be Available');
  assert.strictEqual(frontendAlloc.executionStatus, 'IN_PROGRESS', 'Execution status must be IN_PROGRESS');
  assert.strictEqual(frontendAlloc.monitoringStatus, 'Pending Approval', 'Monitoring status must be Pending Approval');
  assert.ok(frontendAlloc.planSteps.length > 0, 'Plan steps must be populated');

  // Verify Step 2 & 3B: Case B (Worker is NOT Available - Rahul is Busy / Missing)
  assert.strictEqual(backendAlloc.status, 'HIRE_REQUIRED', 'Backend domain must trigger HIRE_REQUIRED');
  assert.strictEqual(backendAlloc.assignedWorker, null, 'Assigned worker must be null');
  assert.strictEqual(backendAlloc.executionStatus, 'BLOCKED', 'Execution status must be BLOCKED');
  assert.ok(backendAlloc.systemAlert?.includes('ACTION REQUIRED'), 'System alert must specify Action Required');
  assert.ok(backendAlloc.systemAlert?.includes('hire a contractor or full-time employee'), 'Alert must advise hiring');
  assert.ok(backendAlloc.hiringSuggestion?.includes('Python Backend'), 'Hiring suggestion must specify domain');
  assert.ok(backendAlloc.hinglishRecommendation?.includes('Python Backend Developer hire karna chahiye'), 'Must include Hinglish recommendation with domain specs');

  // Verify Step 4: Plan Generation & Dependency Gating
  assert.strictEqual(assessment.executionGated, true, 'Pipeline must be gated when a domain requires hire');
  assert.strictEqual(assessment.pipelineStatus, 'BLOCKED_ON_HIRE', 'Pipeline status must be BLOCKED_ON_HIRE');
  assert.ok(assessment.gateReason?.includes('AI multi-agent execution pipeline is blocked'), 'Gate reason must be explicitly recorded');

  // Verify Step 5: Master Tracking Blueprint
  assert.strictEqual(assessment.monitoringBlueprint.length, 2, 'Monitoring blueprint must contain 2 rows');
  
  const uiRow = assessment.monitoringBlueprint.find(r => r.subTask.toLowerCase().includes('ui') || r.subTask.toLowerCase().includes('dashboard'));
  const smtpRow = assessment.monitoringBlueprint.find(r => r.subTask.toLowerCase().includes('smtp') || r.subTask.toLowerCase().includes('backend'));

  assert.ok(uiRow, 'UI Dashboard row exists in monitoring blueprint');
  assert.ok(smtpRow, 'SMTP Backend Worker row exists in monitoring blueprint');

  assert.ok(uiRow?.humanEmployee.includes('Aman'), 'UI Dashboard human employee is Aman (Available)');
  assert.strictEqual(uiRow?.executionStatus, '⏳ In Progress', 'UI Dashboard execution status is ⏳ In Progress');
  assert.deepStrictEqual(uiRow?.headControls, ['Pause', 'Revoke'], 'Head controls for in-progress slot: Pause, Revoke');

  assert.strictEqual(smtpRow?.humanEmployee, 'None', 'SMTP worker human employee is None');
  assert.strictEqual(smtpRow?.executionStatus, '❌ BLOCKED (Hire Recommended)', 'SMTP execution status is ❌ BLOCKED (Hire Recommended)');
  assert.deepStrictEqual(smtpRow?.headControls, ['Click to Post Job', 'Assign Worker'], 'Head controls for blocked slot: Click to Post Job, Assign Worker');

  console.log('✅ PASS: Multi-Agent 5-Step Orchestration (Steps 1, 2, 3A, 3B, 4, 5) verified');
});

test('Multi-Agent 5-Step Orchestration: Step 5 Head Controls (Hire Worker & Unblock Pipeline)', async () => {
  const projectInput = 'We need an email marketing system with a React dashboard and a secure Python SMTP background processing worker.';

  const assessment = await multiAgentOrchestratorService.orchestrateTask({
    userRequirement: projectInput,
    startupId: 'test_startup_controls'
  });

  assert.strictEqual(assessment.executionGated, true, 'Initially gated before hiring');
  assert.strictEqual(assessment.hireRequiredCount, 1, '1 slot requires hire');

  // Head uses control: "Click to Post Job / Assign Worker" to hire a Python Backend developer
  const updated = await multiAgentOrchestratorService.assignWorkerToSlot({
    assessmentId: assessment.id,
    domain: 'Python Backend',
    workerName: 'Vikram Sharma',
    workerEmail: 'vikram.sharma@company.internal',
    startupId: 'test_startup_controls'
  });

  // Verify slot is now filled and assigned
  const backendAlloc = updated.allocations.find(a => 
    multiAgentOrchestratorService.matchDomain(a.requiredDomain, 'Python Backend')
  );

  assert.strictEqual(backendAlloc?.status, 'ASSIGNED', 'Backend domain is now ASSIGNED');
  assert.strictEqual(backendAlloc?.assignedWorker?.name, 'Vikram Sharma', 'Assigned worker is Vikram Sharma');
  assert.strictEqual(backendAlloc?.assignedWorker?.status, 'Available', 'Worker is registered as Available');
  assert.strictEqual(backendAlloc?.executionStatus, 'IN_PROGRESS', 'Execution status transitions to IN_PROGRESS');

  // Verify pipeline dependency gating is lifted
  assert.strictEqual(updated.executionGated, false, 'Pipeline is no longer gated');
  assert.strictEqual(updated.pipelineStatus, 'EXECUTING', 'Pipeline status transitions to EXECUTING');
  assert.strictEqual(updated.hireRequiredCount, 0, '0 slots remaining for hire');
  assert.strictEqual(updated.assignedCount, 2, 'Both slots are now assigned');

  // Verify monitoring blueprint reflects Vikram
  const smtpRow = updated.monitoringBlueprint.find(r => r.subTask.toLowerCase().includes('smtp') || r.subTask.toLowerCase().includes('backend'));
  assert.ok(smtpRow?.humanEmployee.includes('Vikram Sharma'), 'Monitoring blueprint shows Vikram Sharma (Available)');
  assert.strictEqual(smtpRow?.executionStatus, '⏳ In Progress', 'Monitoring status updated to ⏳ In Progress');
  assert.deepStrictEqual(smtpRow?.headControls, ['Pause', 'Revoke'], 'Controls switched to Pause, Revoke');

  // Head tests "Pause" control
  const paused = multiAgentOrchestratorService.controlSlot({
    assessmentId: assessment.id,
    domain: 'Python Backend',
    action: 'pause'
  });

  const pausedAlloc = paused.allocations.find(a => 
    multiAgentOrchestratorService.matchDomain(a.requiredDomain, 'Python Backend')
  );
  assert.strictEqual(pausedAlloc?.executionStatus, 'PAUSED', 'Slot paused by Head');

  // Head tests "Resume" control
  const resumed = multiAgentOrchestratorService.controlSlot({
    assessmentId: assessment.id,
    domain: 'Python Backend',
    action: 'resume'
  });
  const resumedAlloc = resumed.allocations.find(a => 
    multiAgentOrchestratorService.matchDomain(a.requiredDomain, 'Python Backend')
  );
  assert.strictEqual(resumedAlloc?.executionStatus, 'IN_PROGRESS', 'Slot resumed by Head');

  // Head tests "Revoke" control -> should unassign worker and re-gate pipeline
  const revoked = multiAgentOrchestratorService.controlSlot({
    assessmentId: assessment.id,
    domain: 'Python Backend',
    action: 'revoke'
  });
  const revokedAlloc = revoked.allocations.find(a => 
    multiAgentOrchestratorService.matchDomain(a.requiredDomain, 'Python Backend')
  );
  assert.strictEqual(revokedAlloc?.status, 'HIRE_REQUIRED', 'Slot reverted to HIRE_REQUIRED');
  assert.strictEqual(revokedAlloc?.assignedWorker, null, 'Worker unassigned');
  assert.strictEqual(revokedAlloc?.executionStatus, 'BLOCKED', 'Execution status returned to BLOCKED');
  assert.strictEqual(revoked.executionGated, true, 'Pipeline re-gated upon revocation');

  console.log('✅ PASS: Multi-Agent Step 5 Head Controls (Hire, Unblock, Pause, Resume, Revoke) verified');
});
