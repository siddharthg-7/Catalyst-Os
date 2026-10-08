import { test } from 'node:test';
import assert from 'node:assert';
import { multiAgentCouncil } from '../backend/services/multiAgentCouncil';
import { CanonicalStartupContext } from '../backend/services/workspaceService';

const mockStartupContext: CanonicalStartupContext = {
  startupId: 'stp_test_123',
  userId: 'usr_founder_test',
  ownerId: 'usr_founder_test',
  startup: {
    name: 'Apex AI',
    stage: 'Seed',
    industry: 'Enterprise Software',
    description: 'Autonomous enterprise workflows'
  },
  founder: {
    id: 'usr_founder_test',
    name: 'Alex Founder',
    email: 'alex@apex.ai',
    role: 'Founder'
  },
  financials: {
    cashBalance: 500000,
    monthlyBurn: 40000,
    runwayMonths: 12.5
  },
  business: {
    model: 'B2B SaaS',
    primaryProduct: 'Autonomous Executive OS',
    targetIcp: 'Seed to Series B B2B Founders',
    problem: 'Executive coordination overhead',
    valueProposition: 'Autonomous Executive AI Council',
    additionalInfo: ''
  },
  goals: Object.assign(['Expand product engineering velocity', 'Maintain 12+ months runway'], {
    strategicGoals: ['Expand velocity'],
    currentPriorities: ['Maintain runway'],
    targetMilestones: ['V1 launch']
  }) as any
} as unknown as CanonicalStartupContext;

test('MultiAgentCouncil - CEO Decomposition creates structured work orders', async () => {
  const decomposition = await multiAgentCouncil.decompose('Hire 2 senior backend engineers', mockStartupContext);

  assert.ok(decomposition.objective, 'Decomposition must have a top-level strategic objective');
  assert.ok(decomposition.workOrders.length >= 4, 'Must create work orders for TALENT, FINANCE, LEGAL, OPERATIONS, AUDITOR');

  const depts = decomposition.workOrders.map(w => w.department);
  assert.ok(depts.includes('TALENT'), 'TALENT work order must be present');
  assert.ok(depts.includes('FINANCE'), 'FINANCE work order must be present');
  assert.ok(depts.includes('LEGAL'), 'LEGAL work order must be present');
  assert.ok(depts.includes('AUDITOR'), 'AUDITOR work order must be present');

  // Verify dependency ordering
  const auditorOrder = decomposition.workOrders.find(w => w.department === 'AUDITOR');
  assert.ok(auditorOrder, 'Auditor work order exists');
  assert.ok(auditorOrder.dependencies.length > 0, 'Auditor depends on upstream executive outputs');
});

test('MultiAgentCouncil - Independent Agent Execution produces verified votes', async () => {
  const result = await multiAgentCouncil.executeCouncil('Hire 1 senior backend engineer', mockStartupContext);

  assert.ok(result.boardConsensus, 'Board consensus must be produced');
  assert.strictEqual(result.boardConsensus.totalVotes >= 5, true, 'At least 5 executive agents must cast votes');
  assert.strictEqual(result.boardConsensus.hasUnresolvedVeto, false, 'No veto should occur for healthy 12.5 mo runway');

  const cfoVote = result.boardConsensus.votes.find(v => v.agentRole === 'CFO');
  assert.ok(cfoVote, 'CFO vote must exist');
  assert.strictEqual(cfoVote.verdict, 'APPROVE');

  const auditorVote = result.boardConsensus.votes.find(v => v.agentRole === 'Auditor');
  assert.ok(auditorVote, 'Auditor vote must exist');
  assert.strictEqual(auditorVote.verdict, 'APPROVE');
  assert.strictEqual(result.auditorAudit.passed, true, 'Auditor audit passed');
});

test('MultiAgentCouncil - CFO Veto triggers when runway drops below critical threshold (<4 months)', async () => {
  const constrainedContext: CanonicalStartupContext = {
    ...mockStartupContext,
    financials: {
      cashBalance: 60000,
      monthlyBurn: 15000,
      runwayMonths: 4.0
    }
  } as unknown as CanonicalStartupContext;

  // Attempting to hire 3 engineers on $60k cash will collapse runway below 2 months
  const result = await multiAgentCouncil.executeCouncil('Hire 3 senior engineers', constrainedContext);

  assert.strictEqual(result.boardConsensus.hasUnresolvedVeto, true, 'Board consensus must register an active veto');
  assert.strictEqual(result.boardConsensus.verdict, 'BLOCKED_BY_VETO');

  const cfoVote = result.boardConsensus.votes.find(v => v.agentRole === 'CFO');
  assert.ok(cfoVote);
  assert.strictEqual(cfoVote.verdict, 'VETO');
  assert.ok(cfoVote.reason.includes('CRITICAL TREASURY RISK') || cfoVote.reason.includes('runway'));
  assert.strictEqual(result.finalSynthesis.riskTier, 'CRITICAL');
});

test('MultiAgentCouncil - Legal conditions enforce IP protection on hiring', async () => {
  const result = await multiAgentCouncil.executeCouncil('Hire 1 lead designer', mockStartupContext);

  const legalVote = result.boardConsensus.votes.find(v => v.agentRole === 'Legal');
  assert.ok(legalVote, 'Legal vote must be recorded');
  assert.strictEqual(legalVote.verdict, 'APPROVE_WITH_CONDITIONS');
  assert.ok(legalVote.conditions?.some(c => c.includes('PIIA') || c.includes('Proprietary')), 'Must require PIIA condition');
});

test('MultiAgentCouncil - Auditor verification gate verifies deterministic math', async () => {
  const result = await multiAgentCouncil.executeCouncil('Hire 1 software engineer', mockStartupContext);

  assert.strictEqual(result.auditorAudit.passed, true);
  assert.ok(result.auditorAudit.verificationNotes.some(n => n.includes('Deterministic financial engine verified')));
});
