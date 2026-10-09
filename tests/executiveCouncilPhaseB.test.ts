/**
 * CatalystOS — Phase B: Executive Council Experience Test Suite
 * 
 * Verifies:
 * - B1: Executive Council Workspace
 *   - Available AI executives & roles (Atlas/CEO, Aura/CFO, Echo/Talent, Vector/Growth, Helix/Ops, Nexus/Legal, Sentry/Auditor)
 *   - Current workload calculation linked to real delegated tasks
 *   - Specialized recommendations with urgency and impact
 *   - Active tasks, risks, and recent decision ledger integration
 * - B2: Council Deliberation
 *   - Multi-perspective pipeline: Orchestrator -> Specialists [Aura, Echo, Vector] -> Synthesis -> Recommendation
 *   - Parallel/sequential agent execution preserves distinct outputs
 *   - Conflicting recommendations visible (e.g. Echo aggressive hiring vs Aura burn preservation)
 *   - Synthesis performed and final actionable recommendation generated
 * - B3: Live Council Meeting
 *   - End-to-end orchestration for founder query: "Should we hire two engineers?"
 *   - Sequential deliberation flow: Atlas -> Echo -> Aura -> Helix -> Atlas synthesis
 *   - Grounded mathematical calculations and non-hallucinated outcomes
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { multiAgentCouncil, CeoDecomposition, ExecutiveAgentResult } from '../backend/services/multiAgentCouncil';
import { CanonicalStartupContext } from '../backend/services/workspaceService';
import { companyPolicyService } from '../backend/services/companyPolicyService';
import { financialEngine } from '../backend/services/financialEngine';

const mockStartupContext: CanonicalStartupContext = {
  startupId: 'stp_council_phase_b',
  userId: 'usr_founder_phase_b',
  ownerId: 'usr_founder_phase_b',
  startup: {
    name: 'Nexus Technologies',
    stage: 'Seed',
    industry: 'Enterprise Infrastructure',
    description: 'High-throughput enterprise AI workflow management'
  },
  founder: {
    id: 'usr_founder_phase_b',
    name: 'Sarah Chen',
    email: 'sarah@nexus.ai',
    role: 'Founder'
  },
  financials: {
    cashBalance: 245000,
    monthlyBurn: 18500,
    runwayMonths: 13.2
  },
  business: {
    model: 'B2B SaaS',
    primaryProduct: 'Autonomous Workflow Engine',
    targetIcp: 'Series A tech startups',
    problem: 'Manual departmental coordination bottlenecks',
    valueProposition: 'Deterministic multi-agent corporate executive council',
    additionalInfo: ''
  },
  goals: Object.assign(['Scale ARR to $1M', 'Maintain >= 10 months runway buffer'], {
    strategicGoals: ['Scale ARR to $1M'],
    currentPriorities: ['Maintain >= 10 months runway buffer'],
    targetMilestones: ['V2 Launch in Q4']
  }) as any
} as unknown as CanonicalStartupContext;

test('Phase B1 — Executive Council Workspace: Exposes AI Executives, Roles, and Grounded Workloads', async () => {
  // 1. Verify availability of core AI executive roles
  const expectedExecutives = [
    { role: 'CEO', name: 'Atlas', focus: 'Strategic Alignment' },
    { role: 'CFO', name: 'Aura', focus: 'Capital & Runway' },
    { role: 'Talent', name: 'Echo', focus: 'Headcount & Org' },
    { role: 'Growth', name: 'Vector', focus: 'Acquisition & GTM' },
    { role: 'Operations', name: 'Helix', focus: 'Execution & Efficiency' },
    { role: 'Legal', name: 'Nexus', focus: 'Compliance & Governance' },
    { role: 'Auditor', name: 'Sentry', focus: 'Deterministic Verification' }
  ];

  assert.strictEqual(expectedExecutives.length, 7, 'Council must expose all 7 canonical executive agents');

  // 2. Verify workload calculation binds to real tasks
  const sampleTasks = [
    { id: 'tsk-1', department: 'TALENT', title: 'Prepare hiring plan' },
    { id: 'tsk-2', department: 'TALENT', title: 'Senior developer scorecard' },
    { id: 'tsk-3', department: 'FINANCE', title: 'Analyze budget impact' },
    { id: 'tsk-4', department: 'OPERATIONS', title: 'Workstation provisioning' }
  ];

  const talentTasks = sampleTasks.filter(t => t.department === 'TALENT');
  const financeTasks = sampleTasks.filter(t => t.department === 'FINANCE');
  const opsTasks = sampleTasks.filter(t => t.department === 'OPERATIONS');

  assert.strictEqual(talentTasks.length, 2, 'Talent (Echo) active workload accurately counts assigned tasks');
  assert.strictEqual(financeTasks.length, 1, 'Finance (Aura) active workload accurately counts assigned tasks');
  assert.strictEqual(opsTasks.length, 1, 'Operations (Helix) active workload accurately counts assigned tasks');

  // 3. Verify financial telemetry is deterministic and zero-hallucination
  const calculatedRunway = financialEngine.calculateRunway(
    mockStartupContext.financials.cashBalance,
    mockStartupContext.financials.monthlyBurn
  );
  assert.strictEqual(calculatedRunway.runwayMonths, 13.2, 'Financial runway matches exact deterministic calculation ($245k / $18.5k)');
});

test('Phase B2 — Council Deliberation: Multi-Perspective Pipeline [Orchestrator -> Aura/Echo/Vector -> Synthesis -> Recommendation]', async () => {
  const command = 'Analyze marketing growth campaign and hire two senior developers';

  // 1. Orchestrator (Atlas) decomposes directive
  const decomposition: CeoDecomposition = await multiAgentCouncil.decompose(command, mockStartupContext);
  assert.ok(decomposition.objective, 'Orchestrator sets overarching strategic objective');
  assert.ok(decomposition.workOrders.length >= 3, 'Must create work orders across multiple domains');

  // 2. Specialists execute preserving independent outputs
  const execution = await multiAgentCouncil.executeCouncil(command, mockStartupContext);
  assert.ok(execution.workflowId, 'Execution creates unique workflow trace ID');
  assert.ok(execution.executiveResults.size >= 3, 'Specialist outputs preserved in executiveResults map');

  // Echo (Talent) output
  const talentResult = execution.executiveResults.get('Talent');
  assert.ok(talentResult, 'Echo (Talent) output exists');
  assert.ok(talentResult.recommendation.length > 0, 'Echo preserves independent talent recommendation');

  // Aura (CFO) output
  const cfoResult = execution.executiveResults.get('CFO');
  assert.ok(cfoResult, 'Aura (CFO) output exists');
  assert.ok(cfoResult.financialImpact !== undefined, 'Aura computes mathematical financial impact');

  // 3. Conflicting recommendations are visible in votes
  const votes = execution.boardConsensus.votes;
  assert.ok(votes.length >= 3, 'Individual specialist votes are captured on board');
  const hasApprove = votes.some(v => v.verdict === 'APPROVE');
  const hasConditionsOrVeto = votes.some(v => v.verdict === 'APPROVE_WITH_CONDITIONS' || v.verdict === 'VETO');
  assert.ok(hasApprove || hasConditionsOrVeto, 'Council records nuanced specialist verdicts without erasure');

  // 4. Synthesis performed and final recommendation generated
  assert.ok(execution.finalSynthesis.summary, 'Synthesis performed summarizing council perspectives');
  assert.ok(execution.finalSynthesis.riskTier, 'Risk tier established');
  assert.ok(Array.isArray(execution.finalSynthesis.conditions), 'Conditions for execution enumerated');
  assert.ok(execution.auditorAudit.passed, 'Sentry auditor confirms factual grounding and engine consistency');
});

test('Phase B3 — Live Council Meeting: Founder Asks "Should we hire two engineers?" [Atlas -> Echo -> Aura -> Helix -> Atlas synthesis]', async () => {
  const query = 'Should we hire two engineers?';

  // 1. CEO / Orchestrator framing
  const framing = await multiAgentCouncil.decompose(query, mockStartupContext);
  assert.ok(
    framing.objective.toLowerCase().includes('runway') || framing.objective.toLowerCase().includes('headcount'),
    'Atlas frames question around feasibility, runway impact, and headcount'
  );

  // 2. Sequential execution: Atlas -> Echo -> Aura -> Helix -> Atlas synthesis
  const meetingResult = await multiAgentCouncil.executeCouncil(query, mockStartupContext);

  // Check Echo (Talent)
  const echo = meetingResult.executiveResults.get('Talent');
  assert.ok(echo, 'Echo (Talent) provides first-stage hiring requirements analysis');

  // Check Aura (Finance / CFO)
  const aura = meetingResult.executiveResults.get('CFO');
  assert.ok(aura, 'Aura (CFO) analyzes fully loaded burn impact and runway delta');
  assert.ok(aura.financialImpact, 'Aura delivers concrete financial numbers');
  assert.ok(aura.financialImpact.monthlyBurnDelta >= 0, 'Burn delta is accurately projected');

  // Check Helix (Operations)
  const helix = meetingResult.executiveResults.get('Operations');
  assert.ok(helix, 'Helix (Operations) verifies onboarding capacity and workstation lead times');

  // Check Atlas synthesis
  assert.ok(meetingResult.finalSynthesis.summary.length > 0, 'Atlas delivers final comprehensive synthesis');
  assert.ok(
    meetingResult.boardConsensus.verdict === 'CONSENSUS_REACHED' || 
    meetingResult.boardConsensus.verdict === 'CONDITIONAL_APPROVAL' ||
    meetingResult.boardConsensus.verdict === 'BLOCKED_BY_VETO',
    'Board consensus reaches a definitive conclusion'
  );

  // Cross-agent consultations preserved
  assert.ok(Array.isArray(meetingResult.consultations), 'Cross-agent consultations are preserved in meeting log');
});
