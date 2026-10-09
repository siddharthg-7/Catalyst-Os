import { test } from 'node:test';
import assert from 'node:assert';
import { 
  retrieveRelevantKnowledge, 
  filterKnowledgeForAgent, 
  buildContext,
  ragEngine
} from '../backend/services/ragEngine';
import { 
  orchestrationService, 
  analyzeCommandIntent, 
  evaluateKnowledgeNeed 
} from '../backend/services/orchestrationService';
import { multiAgentCouncil } from '../backend/services/multiAgentCouncil';
import { CanonicalStartupContext } from '../backend/services/workspaceService';
import { knowledgeFiles } from '../backend/state';

const mockStartupContext: any = {
  startupId: 'st_catalystos',
  userId: 'usr_founder_rag',
  ownerId: 'usr_founder_rag',
  startup: {
    name: 'CatalystOS Inc',
    stage: 'Series A',
    industry: 'Enterprise Software',
    description: 'Autonomous AI Executive Operating System'
  },
  identity: {
    name: 'CatalystOS Inc',
    stage: 'Series A',
    industry: 'Enterprise Software',
    description: 'Autonomous AI Executive Operating System'
  },
  founder: {
    id: 'usr_founder_rag',
    name: 'Alex Rivera',
    email: 'alex@catalystos.ai',
    role: 'Founder'
  },
  financials: {
    cashBalance: 2500000,
    monthlyBurn: 110000,
    runwayMonths: 22.7,
    healthScore: 88
  },
  financial: {
    cashBalance: 2500000,
    monthlyBurn: 110000,
    runwayMonths: 22.7,
    healthScore: 88,
    metrics: { velocity: 85, financialHealth: 90, legalCompliance: 95, growthRate: 70, operationsEfficiency: 85 }
  },
  business: {
    model: 'B2B SaaS',
    primaryProduct: 'Autonomous Executive Mesh',
    targetIcp: 'Enterprise CTOs & VPs of Engineering',
    problem: 'Departmental coordination friction',
    valueProposition: 'Deterministic multi-agent operational orchestration',
    additionalInfo: ''
  },
  growth: {
    goals: ['Maintain 6-month runway reserve', 'Scale engineering headcount in line with hiring policy'],
    currentPriorities: ['Scale engineering headcount in line with hiring policy'],
    targetTimeline: '90 days'
  },
  operations: {
    teamSize: '12 employees',
    biggestChallenge: 'Engineering delivery bottleneck',
    executiveAgents: [],
    pendingApprovalsCount: 0,
    pendingApprovals: []
  },
  goals: Object.assign(['Maintain 6-month runway reserve', 'Scale engineering headcount in line with hiring policy'], {
    strategicGoals: ['Maintain 6-month runway reserve'],
    currentPriorities: ['Scale engineering headcount in line with hiring policy'],
    targetMilestones: ['V2 Launch']
  })
};

test('A3 Company Knowledge [1]: Knowledge Need Decision Gate detects policy & planning commands', () => {
  // 1. Explicit policy reference command
  const policyCommand = 'Create our hiring plan according to company policy.';
  const need1 = evaluateKnowledgeNeed(policyCommand, 'hiring_scenario');
  assert.strictEqual(need1.needsKnowledge, true, 'Must identify need for company documents');
  assert.ok(need1.searchQueries.length > 0, 'Must generate targeted search sub-queries');
  assert.ok(need1.searchQueries.some(q => q.toLowerCase().includes('hiring') || q.toLowerCase().includes('policy')));

  // 2. Full intent analysis integration
  const analysis = analyzeCommandIntent(policyCommand);
  assert.strictEqual(analysis.needsCompanyKnowledge, true);
  assert.ok(analysis.knowledgeReason?.toLowerCase().includes('polic'));

  // 3. Trivial command without knowledge needs
  const trivialCommand = 'What is 2 + 2?';
  const need2 = evaluateKnowledgeNeed(trivialCommand, 'general_advisory');
  assert.strictEqual(need2.needsKnowledge, false);
});

test('A3 Company Knowledge [2]: Relevant-document retrieval fetches Hiring Policy, Employee Handbook, & Strategy', async () => {
  const startupId = 'st_catalystos';
  const command = 'Create our hiring plan according to company policy.';

  const chunks = await retrieveRelevantKnowledge({
    startupId,
    command,
    subQueries: ['hiring policy standards', 'employee handbook benefits', 'company strategy hiring headcount'],
    limit: 6,
    minSimilarity: 0.2
  });

  assert.ok(chunks.length > 0, 'Must retrieve knowledge chunks');

  // Verify retrieved documents include Hiring Policy, Employee Handbook, and Company Strategy
  const docNames = chunks.map(c => c.documentName.toLowerCase());
  const hasHiringPolicy = docNames.some(d => d.includes('hiring policy'));
  const hasHandbook = docNames.some(d => d.includes('employee handbook'));
  const hasStrategy = docNames.some(d => d.includes('company strategy') || d.includes('strategy'));

  assert.strictEqual(hasHiringPolicy, true, 'Must retrieve Hiring Policy.pdf');
  assert.strictEqual(hasHandbook, true, 'Must retrieve Employee Handbook.pdf');
  assert.strictEqual(hasStrategy, true, 'Must retrieve Company Strategy.docx');

  // Verify all retrieved chunks belong strictly to the querying tenant
  for (const chunk of chunks) {
    assert.strictEqual(chunk.startupId, startupId, 'All retrieved chunks must match tenant startupId');
  }
});

test('A3 Company Knowledge [3]: Domain-specific agent filtering gives only pertinent chunks to each agent', async () => {
  const startupId = 'st_catalystos';
  const command = 'Create our hiring plan according to company policy.';

  const allChunks = await retrieveRelevantKnowledge({
    startupId,
    command,
    subQueries: ['hiring policy interview', 'benefits handbook', 'runway buffer strategy'],
    limit: 6
  });

  // 1. Talent Agent: Gets hiring & handbook chunks
  const talentSlice = filterKnowledgeForAgent('talent', allChunks);
  assert.ok(talentSlice.citations.length > 0, 'Talent agent must receive citations');
  const talentDocs = talentSlice.citations.map(c => c.documentName.toLowerCase());
  assert.ok(
    talentDocs.some(d => d.includes('hiring') || d.includes('handbook')),
    'Talent slice must contain Hiring Policy or Handbook'
  );

  // 2. CFO Agent: Gets strategy & financial chunks
  const cfoSlice = filterKnowledgeForAgent('cfo', allChunks);
  assert.ok(cfoSlice.citations.length > 0, 'CFO agent must receive citations');
  const cfoDocs = cfoSlice.citations.map(c => c.documentName.toLowerCase());
  assert.ok(
    cfoDocs.some(d => d.includes('strategy') || d.includes('policy')),
    'CFO slice must contain Strategy or compensation policy'
  );

  // 3. Legal Agent: Gets handbook & compliance chunks
  const legalSlice = filterKnowledgeForAgent('legal', allChunks);
  assert.ok(legalSlice.citations.length > 0, 'Legal agent must receive citations');
  const legalDocs = legalSlice.citations.map(c => c.documentName.toLowerCase());
  assert.ok(
    legalDocs.some(d => d.includes('handbook') || d.includes('policy')),
    'Legal slice must contain Handbook or governance policy'
  );

  // 4. Operations Agent: Gets operations/roadmap chunks
  const opsSlice = filterKnowledgeForAgent('operations', allChunks);
  assert.ok(opsSlice.citations.length > 0, 'Operations agent must receive citations');
});

test('A3 Company Knowledge [4]: Context size controlled and bounded', async () => {
  const startupId = 'st_catalystos';
  const allChunks = await retrieveRelevantKnowledge({
    startupId,
    command: 'Create our hiring plan according to company policy.',
    limit: 8
  });

  const roles = ['talent', 'cfo', 'legal', 'operations', 'growth'];

  for (const role of roles) {
    const slice = filterKnowledgeForAgent(role, allChunks, { maxChunks: 2, maxCharsPerChunk: 600 });
    // Verify specialist received at most 2 chunks
    assert.ok(slice.rawChunks.length <= 2, `${role} must receive <= 2 chunks`);
    // Verify total context length is bounded (< 1600 characters with XML tags)
    assert.ok(slice.contextText.length <= 1600, `${role} context text must be bounded`);
    // Verify XML tag structure
    assert.ok(slice.contextText.includes('<agent_retrieved_context'), 'Must have safe structured XML wrapper');
  }
});

test('A3 Company Knowledge [5]: Strict Multi-Tenant Isolation — Zero cross-company document retrieval', async () => {
  const tenantA = 'st_catalystos';
  const tenantB = 'st_foreign_competitor_99';

  // Seed a proprietary document belonging to Tenant B
  ragEngine.indexDocument({
    id: 'doc_secret_foreign',
    startupId: tenantB,
    name: 'Competitor_Secret_M&A_Plan.pdf',
    type: 'strategy',
    content: 'Target acquisition: CatalystOS at $50M valuation. Classified company policy.'
  });

  // Query as Tenant A for "CatalystOS M&A Plan"
  const tenantAChunks = await retrieveRelevantKnowledge({
    startupId: tenantA,
    command: 'What is our M&A plan according to company policy?',
    subQueries: ['CatalystOS M&A Plan', 'acquisition policy'],
    limit: 6
  });

  // Verify Tenant A NEVER retrieves Tenant B's documents
  const leakedChunks = tenantAChunks.filter(c => c.startupId === tenantB || c.documentName.includes('Competitor_Secret'));
  assert.strictEqual(leakedChunks.length, 0, 'Tenant A must NEVER retrieve Tenant B documents');

  // Query as Tenant B
  const tenantBChunks = await retrieveRelevantKnowledge({
    startupId: tenantB,
    command: 'What is our M&A plan according to company policy?',
    limit: 6
  });

  // Verify Tenant B CAN retrieve its own document
  assert.ok(tenantBChunks.some(c => c.documentName.includes('Competitor_Secret')), 'Tenant B retrieves its own document');
  // And Tenant B NEVER retrieves Tenant A's documents
  assert.strictEqual(tenantBChunks.some(c => c.startupId === tenantA), false, 'Tenant B must NEVER retrieve Tenant A documents');
});

test('A3 Company Knowledge [6]: End-to-End Orchestrator Pipeline grounding & Auditor verification', async () => {
  const command = 'Create our hiring plan according to company policy.';

  // Execute full command pipeline
  const response = await orchestrationService.executeCommand(
    command,
    { startupId: 'st_catalystos', userId: 'usr_founder_rag', context: mockStartupContext }
  );

  assert.strictEqual(response.status, 'needs_approval');
  assert.ok(response.evidence.length > 0, 'Orchestration response must contain verified evidence citations');

  // Verify retrieved evidence names
  const evidenceDocNames = response.evidence.map(e => e.documentName.toLowerCase());
  assert.ok(
    evidenceDocNames.some(d => d.includes('hiring') || d.includes('handbook') || d.includes('strategy')),
    'Evidence must cite company policy or handbook documents'
  );

  // Execute council directly to inspect agent-specific citations and Auditor verification
  const councilResult = await multiAgentCouncil.executeCouncil(
    command,
    mockStartupContext,
    response.evidence.map(e => e.excerpt),
    {
      activatedRoles: ['Talent', 'Finance', 'Legal', 'Operations', 'Auditor'],
      agentKnowledgeMap: {
        talent: filterKnowledgeForAgent('talent', await retrieveRelevantKnowledge({ startupId: 'st_catalystos', command, limit: 6 })),
        cfo: filterKnowledgeForAgent('cfo', await retrieveRelevantKnowledge({ startupId: 'st_catalystos', command, limit: 6 })),
        legal: filterKnowledgeForAgent('legal', await retrieveRelevantKnowledge({ startupId: 'st_catalystos', command, limit: 6 })),
        operations: filterKnowledgeForAgent('operations', await retrieveRelevantKnowledge({ startupId: 'st_catalystos', command, limit: 6 })),
        auditor: filterKnowledgeForAgent('auditor', await retrieveRelevantKnowledge({ startupId: 'st_catalystos', command, limit: 6 }))
      }
    }
  );

  // Check Talent agent grounded in Hiring Policy
  const talent = councilResult.executiveResults.get('Talent');
  assert.ok(talent, 'Talent agent must execute');
  assert.ok(talent.citations.length > 0, 'Talent agent must retain citations');
  assert.ok(
    talent.assumptions.some(a => a.toLowerCase().includes('hiring policy')),
    'Talent assumptions must ground in Hiring Policy'
  );

  // Check Legal agent grounded in Employee Handbook (PIIA & at-will)
  const legal = councilResult.executiveResults.get('Legal');
  assert.ok(legal, 'Legal agent must execute');
  assert.ok(legal.citations.length > 0, 'Legal agent must retain citations');
  assert.ok(
    legal.conditions.some(c => c.toLowerCase().includes('piia') || c.toLowerCase().includes('handbook')),
    'Legal conditions must enforce PIIA per Employee Handbook'
  );

  // Check Operations agent grounded in Company Strategy roadmap or Employee Handbook
  const ops = councilResult.executiveResults.get('Operations');
  assert.ok(ops, 'Operations agent must execute');
  assert.ok(ops.citations.length > 0, 'Operations agent must retain citations');
  assert.ok(
    ops.assumptions.some(a => a.toLowerCase().includes('company strategy') || a.toLowerCase().includes('strategy')) ||
    ops.conditions.some(c => c.toLowerCase().includes('stipend') || c.toLowerCase().includes('handbook')),
    'Operations must ground in Company Strategy roadmap or Handbook equipment stipend'
  );

  // Check Auditor verification
  assert.strictEqual(councilResult.auditorAudit.passed, true, 'Auditor check must pass');
  assert.ok(
    councilResult.auditorAudit.verificationNotes.some(n => n.includes('Audited') && n.includes('Zero fabrication')),
    'Auditor must verify executive citations against company documents with zero fabrication'
  );
});
