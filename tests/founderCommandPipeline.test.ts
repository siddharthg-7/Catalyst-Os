import { test } from 'node:test';
import assert from 'node:assert';
import { multiAgentCouncil } from '../backend/services/multiAgentCouncil';
import { analyzeCommandIntent } from '../backend/services/orchestrationService';
import { CanonicalStartupContext } from '../backend/services/workspaceService';
import { 
  ownerRoleForDepartment, 
  agentForDepartment 
} from '../backend/services/taskDelegationService';

const mockStartupContext: CanonicalStartupContext = {
  startupId: 'stp_pipeline_test_01',
  userId: 'usr_founder_pipeline',
  ownerId: 'usr_founder_pipeline',
  startup: {
    name: 'Synthetix AI',
    stage: 'Seed',
    industry: 'Enterprise SaaS',
    description: 'Autonomous enterprise operations'
  },
  founder: {
    id: 'usr_founder_pipeline',
    name: 'Sarah Connor',
    email: 'sarah@synthetix.ai',
    role: 'Founder'
  },
  financials: {
    cashBalance: 160000,
    monthlyBurn: 20000,
    runwayMonths: 8.0 // Exactly 8 months runway baseline
  },
  business: {
    model: 'B2B SaaS',
    primaryProduct: 'Enterprise Agent Mesh',
    targetIcp: 'Series A-B Fintech & Healthtech Leaders',
    problem: 'Siloed cross-department execution overhead',
    valueProposition: 'Deterministic multi-agent operational orchestration',
    additionalInfo: ''
  },
  goals: Object.assign(['Scale pipeline to $1M ARR', 'Protect 6+ months runway threshold'], {
    strategicGoals: ['Scale pipeline to $1M ARR'],
    currentPriorities: ['Protect runway threshold'],
    targetMilestones: ['V2 Launch']
  }) as any
} as unknown as CanonicalStartupContext;

test('A2 Pipeline Audit [1]: Advisory Hiring Feasibility — Selective Specialist Execution & CFO Veto', async () => {
  const command = 'We have 8 months runway. Should I hire two engineers next month?';

  // 1. Intent Detection & Agent Selection
  const analysis = analyzeCommandIntent(command);
  assert.strictEqual(analysis.intent, 'hiring_scenario', 'Must classify as hiring scenario');
  assert.strictEqual(analysis.requiresFinancialCalculations, true, 'Requires financial math');
  assert.strictEqual(analysis.requiresHeadcountModeling, true, 'Requires headcount modeling');
  assert.strictEqual(analysis.requiresApproval, false, 'Advisory question must NOT prematurely trigger approval');

  // Verify only relevant specialists selected (CEO + Finance + Talent + Auditor; NO Legal or Ops bloat)
  assert.deepStrictEqual(analysis.activatedRoles, ['CEO', 'Finance', 'Talent', 'Auditor']);
  assert.strictEqual(analysis.activatedRoles.includes('Legal'), false, 'Legal must NOT be invoked on advisory query');
  assert.strictEqual(analysis.activatedRoles.includes('Operations'), false, 'Operations must NOT be invoked on advisory query');

  // 2. Multi-Agent Council Execution with Selective Activation
  const councilResult = await multiAgentCouncil.executeCouncil(
    command,
    mockStartupContext,
    [],
    { activatedRoles: analysis.activatedRoles }
  );

  // Verify only activated specialists executed
  assert.ok(councilResult.executiveResults.has('Talent'), 'Talent agent must execute');
  assert.ok(councilResult.executiveResults.has('CFO'), 'CFO agent must execute');
  assert.ok(councilResult.executiveResults.has('Auditor'), 'Auditor agent must execute');
  assert.strictEqual(councilResult.executiveResults.has('Legal'), false, 'Legal agent must NOT execute');
  assert.strictEqual(councilResult.executiveResults.has('Operations'), false, 'Operations agent must NOT execute');
  assert.strictEqual(councilResult.executiveResults.has('Growth'), false, 'Growth agent must NOT execute');

  // Verify CFO VETO on 8 months runway with 2 new hires (compresses runway < 4 months)
  const cfoVote = councilResult.boardConsensus.votes.find(v => v.agentRole === 'CFO');
  assert.ok(cfoVote, 'CFO vote exists');
  assert.strictEqual(cfoVote.verdict, 'VETO', 'CFO must veto hiring 2 engineers on 8 months runway');
  assert.strictEqual(councilResult.boardConsensus.hasUnresolvedVeto, true, 'Council must record active veto');
  assert.strictEqual(councilResult.finalSynthesis.riskTier, 'CRITICAL', 'Risk tier must be CRITICAL');

  // Verify Auditor validates deterministic math
  const auditorVote = councilResult.boardConsensus.votes.find(v => v.agentRole === 'Auditor');
  assert.ok(auditorVote, 'Auditor vote exists');
  assert.strictEqual(auditorVote.verdict, 'APPROVE');
  assert.strictEqual(councilResult.auditorAudit.passed, true);
});

test('A2 Pipeline Audit [2]: Execution Hiring Plan — Decomposition, Delegation, and Approval Gate', async () => {
  const command = 'Create a hiring plan for two senior engineers.';

  // 1. Intent Detection
  const analysis = analyzeCommandIntent(command);
  assert.strictEqual(analysis.intent, 'hiring_scenario');
  assert.strictEqual(analysis.requiresApproval, true, 'Hiring plan commitment requires approval gate');
  assert.ok(analysis.proposedActionTitle?.includes('Headcount'), 'Must provide proposed action title');

  // Verify full executive team activated for planning
  assert.deepStrictEqual(analysis.activatedRoles, ['CEO', 'Talent', 'Finance', 'Operations', 'Legal', 'Auditor']);

  // 2. Task Decomposition
  const decomposition = await multiAgentCouncil.decompose(command, mockStartupContext);
  assert.ok(decomposition.workOrders.length >= 4, 'Must decompose into cross-functional work orders');
  const departments = decomposition.workOrders.map(w => w.department);
  assert.ok(departments.includes('TALENT'), 'TALENT work order present');
  assert.ok(departments.includes('FINANCE'), 'FINANCE work order present');
  assert.ok(departments.includes('LEGAL'), 'LEGAL work order present');
  assert.ok(departments.includes('OPERATIONS'), 'OPERATIONS work order present');
  assert.ok(departments.includes('AUDITOR'), 'AUDITOR work order present');

  // 3. Department -> Role & Agent Ownership Mapping
  assert.strictEqual(ownerRoleForDepartment('TALENT'), 'HR', 'TALENT work mapped to HR human owner');
  assert.strictEqual(ownerRoleForDepartment('FINANCE'), 'FINANCE', 'FINANCE work mapped to FINANCE human owner');
  assert.strictEqual(ownerRoleForDepartment('OPERATIONS'), 'OPERATIONS', 'OPERATIONS work mapped to OPERATIONS owner');
  assert.strictEqual(ownerRoleForDepartment('LEGAL'), null, 'LEGAL has no human employee (stays founder-owned)');
  assert.strictEqual(agentForDepartment('TALENT'), 'Talent', 'TALENT assisted by Talent agent');
  assert.strictEqual(agentForDepartment('FINANCE'), 'CFO', 'FINANCE assisted by CFO agent');

  // 4. Council Execution produces structured synthesis
  const healthyContext: CanonicalStartupContext = {
    ...mockStartupContext,
    financials: {
      cashBalance: 800000,
      monthlyBurn: 30000,
      runwayMonths: 26.6
    }
  } as unknown as CanonicalStartupContext;

  const councilResult = await multiAgentCouncil.executeCouncil(
    command,
    healthyContext,
    [],
    { activatedRoles: analysis.activatedRoles }
  );

  assert.strictEqual(councilResult.boardConsensus.hasUnresolvedVeto, false, 'Healthy treasury passes');
  assert.strictEqual(councilResult.finalSynthesis.actionRequired, true, 'Action required on hiring plan');
  assert.ok(councilResult.finalSynthesis.details.includes('Talent:'), 'Synthesizes Talent findings');
  assert.ok(councilResult.finalSynthesis.details.includes('Finance:'), 'Synthesizes Finance findings');
  assert.ok(councilResult.finalSynthesis.details.includes('Legal:'), 'Synthesizes Legal findings');
  assert.ok(councilResult.finalSynthesis.details.includes('Operations:'), 'Synthesizes Operations findings');
});

test('A2 Pipeline Audit [3]: Growth Specialization — Growth Agent Invocation & Cross-Agent Consultation', async () => {
  const command = 'Prepare a 30-day GTM plan.';

  // 1. Intent Detection
  const analysis = analyzeCommandIntent(command);
  assert.strictEqual(analysis.intent, 'gtm_planning');
  assert.deepStrictEqual(analysis.activatedRoles, ['CEO', 'Growth', 'Finance', 'Auditor']);
  assert.strictEqual(analysis.activatedRoles.includes('Talent'), false, 'Talent must NOT run for GTM planning');

  // 2. Council Execution
  const councilResult = await multiAgentCouncil.executeCouncil(
    command,
    mockStartupContext,
    [],
    { activatedRoles: analysis.activatedRoles }
  );

  // Growth agent must be executed
  assert.ok(councilResult.executiveResults.has('Growth'), 'Growth agent must execute');
  const growthRes = councilResult.executiveResults.get('Growth');
  assert.strictEqual(growthRes?.role, 'Growth');
  assert.strictEqual(growthRes?.status, 'completed');
  assert.strictEqual(growthRes?.vote.verdict, 'APPROVE');
  assert.ok(growthRes?.dataOutput?.targetIcp, 'Growth grounded in target ICP');

  // Talent must NOT have run
  assert.strictEqual(councilResult.executiveResults.has('Talent'), false, 'Talent was not activated');

  // Growth <-> CFO consultation must be recorded
  assert.ok(
    councilResult.consultations.some(c => c.sourceAgent === 'Growth' && c.targetAgent === 'CFO'),
    'Growth must consult CFO on treasury pacing'
  );
});

test('A2 Pipeline Audit [4]: Financial Treasury Inquiry — Lean Specialist Boundary', async () => {
  const command = 'What is our current runway?';

  const analysis = analyzeCommandIntent(command);
  assert.strictEqual(analysis.intent, 'financial_inquiry');
  assert.deepStrictEqual(analysis.activatedRoles, ['CEO', 'Finance', 'Auditor']);

  const councilResult = await multiAgentCouncil.executeCouncil(
    command,
    mockStartupContext,
    [],
    { activatedRoles: analysis.activatedRoles }
  );

  // Only CFO & Auditor must execute
  assert.ok(councilResult.executiveResults.has('CFO'));
  assert.ok(councilResult.executiveResults.has('Auditor'));
  assert.strictEqual(councilResult.executiveResults.has('Talent'), false);
  assert.strictEqual(councilResult.executiveResults.has('Legal'), false);
  assert.strictEqual(councilResult.executiveResults.has('Operations'), false);
  assert.strictEqual(councilResult.executiveResults.has('Growth'), false);
});
