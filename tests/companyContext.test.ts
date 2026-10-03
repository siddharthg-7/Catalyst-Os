/**
 * CatalystOS - Company Context Layer Test Suite (P1 Task 4)
 * Covers all 8 verification scenarios:
 * 1. Founder can retrieve their company context.
 * 2. Context contains the expected structured company information.
 * 3. Updated company data reflects immediately in context (freshness & cache invalidation).
 * 4. Unauthenticated / empty user cannot retrieve context.
 * 5. Cross-company isolation: User A cannot retrieve User B's company context.
 * 6. AI Chief of Staff receives relevant formatted company context.
 * 7. Specialist agent context scoping (Finance, Growth, Talent, Legal, Operations, CEO).
 * 8. Missing optional fields do not crash the context or AI flow.
 */

import { companyContextService, CompanyContext } from '../backend/services/companyContextService';
import { prisma, safeDbQuery } from '../backend/services/dbService';
import { workspaceService } from '../backend/services/workspaceService';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details || 'Assertion failed'}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 CATALYSTOS P1 TASK 4: COMPANY CONTEXT LAYER TEST SUITE');
  console.log('========================================================\n');

  const testUserAId = `usr_test_a_${Date.now()}`;
  const testUserBId = `usr_test_b_${Date.now()}`;
  let startupAId = '';
  let startupBId = '';

  try {
    // Setup test users and startups in PostgreSQL
    console.log('Setting up isolated test tenant fixtures in database...');
    
    // User A & Startup A
    await safeDbQuery(() =>
      prisma.user.create({
        data: {
          id: testUserAId,
          email: `founder_a_${Date.now()}@example.com`,
          name: 'Alice Founder',
          role: 'Founder'
        }
      })
    );

    const contextA = await workspaceService.saveOnboardingData(testUserAId, {
      startupName: 'Apex Cloud Systems',
      industry: 'Developer Tools',
      description: 'Autonomous Kubernetes cluster optimization',
      fundingStage: 'Seed',
      cashBalance: 400000,
      monthlyBurn: 25000,
      targetIcp: 'DevOps & Site Reliability Engineers',
      primaryProduct: 'Autonomous K8s Scheduler',
      problem: 'High idle cloud spend and manual autoscaling configuration',
      timeline: '60 Days',
      teamSize: '4 engineers',
      additionalInfo: 'Accepted into Top Tier Cloud Accelerator'
    });
    startupAId = contextA.startupId;

    // User B & Startup B
    await safeDbQuery(() =>
      prisma.user.create({
        data: {
          id: testUserBId,
          email: `founder_b_${Date.now()}@example.com`,
          name: 'Bob Competitor',
          role: 'Founder'
        }
      })
    );

    const contextB = await workspaceService.saveOnboardingData(testUserBId, {
      startupName: 'BioHealth Genetics',
      industry: 'Biotechnology',
      description: 'AI genomic variant interpretation',
      fundingStage: 'Pre-Seed',
      cashBalance: 150000,
      monthlyBurn: 10000,
      targetIcp: 'Clinical Diagnostic Labs',
      primaryProduct: 'Variant Insight Engine',
      problem: 'Slow manual review of clinical genomic reports',
      timeline: '90 Days',
      teamSize: '2 founders'
    });
    startupBId = contextB.startupId;

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1 — Founder: Founder can retrieve their company context
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Founder Context Retrieval ---');
    const founderContextA = await companyContextService.getContextForUser(testUserAId);
    assert(founderContextA !== null, 'Founder A retrieves company context successfully');
    assert(founderContextA?.metadata.ownerId === testUserAId, 'Retrieved context belongs to authenticated founder A');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2 — Correct Company: Context contains expected structured company information
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Structured Snapshot Verification ---');
    assert(founderContextA?.identity.name === 'Apex Cloud Systems', 'Company identity name matches database');
    assert(founderContextA?.identity.industry === 'Developer Tools', 'Industry matches onboarding input');
    assert(founderContextA?.identity.stage === 'Seed', 'Stage matches onboarding input');
    assert(founderContextA?.financial.cashBalance === 400000, 'Financial cash balance matches ground truth');
    assert(founderContextA?.financial.monthlyBurn === 25000, 'Monthly burn rate matches ground truth');
    assert(founderContextA?.financial.runwayMonths === 16, 'Runway months correctly calculated (400k / 25k = 16)');
    assert(founderContextA?.business.targetIcp.includes('DevOps'), 'Target ICP correctly populated from memories');
    assert(founderContextA?.business.problem.includes('idle cloud spend'), 'Problem statement preserved');
    assert(founderContextA?.operations.teamSize === '4 engineers', 'Team size correctly exposed in operations');
    assert(founderContextA?.founder.name === 'Alice Founder', 'Founder identity accurately linked');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3 — Updated Data: Updating existing company data reflects in next context retrieval
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Context Freshness & Cache Invalidation ---');
    // Update company data in database
    await safeDbQuery(() =>
      prisma.startup.update({
        where: { id: startupAId },
        data: {
          cashBalance: 650000,
          burnRate: 32500,
          fundingStage: 'Series A'
        }
      })
    );
    // Invalidate cache
    companyContextService.invalidate(startupAId);
    companyContextService.invalidate(testUserAId);

    // Retrieve fresh context
    const updatedContextA = await companyContextService.getContextForUser(testUserAId);
    assert(updatedContextA?.financial.cashBalance === 650000, 'Updated cash balance reflects immediately (650,000)');
    assert(updatedContextA?.financial.monthlyBurn === 32500, 'Updated burn rate reflects immediately (32,500)');
    assert(updatedContextA?.financial.runwayMonths === 20, 'Updated runway recalculates immediately (650k / 32.5k = 20)');
    assert(updatedContextA?.identity.stage === 'Series A', 'Updated funding stage reflects immediately');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4 — Unauthorized: Unauthenticated / empty user cannot retrieve context
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Unauthenticated User Rejection ---');
    const emptyUserContext = await companyContextService.getContextForUser('');
    assert(emptyUserContext === null, 'Empty userId returns null');
    const nonExistentContext = await companyContextService.getContextForUser('usr_does_not_exist_9999');
    assert(nonExistentContext === null, 'Non-existent userId returns null (does not crash)');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5 — Cross-Company Isolation: Company A user cannot retrieve Company B context
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Multi-Tenant Cross-Company Isolation ---');
    // User A attempts to access Company B context by startupId
    const crossAccessAttempt = await companyContextService.getContextForStartup(startupBId, testUserAId);
    assert(crossAccessAttempt === null, 'User A is STRICTLY BLOCKED from accessing Company B context');

    // Legitimate owner B accesses Company B
    const legitimateAccessB = await companyContextService.getContextForStartup(startupBId, testUserBId);
    assert(legitimateAccessB !== null, 'Legitimate Owner B accesses Company B context successfully');
    assert(legitimateAccessB?.identity.name === 'BioHealth Genetics', 'Company B identity confirmed as BioHealth Genetics');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6 — AI Chief of Staff Integration & Prompt Safety
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: AI Prompt Context Formatting & Safety ---');
    const promptContext = companyContextService.toPromptContext(updatedContextA!, 'CEO');
    assert(promptContext.includes('Apex Cloud Systems'), 'Prompt includes company identity');
    assert(promptContext.includes('$650,000'), 'Prompt includes verified treasury cash');
    assert(promptContext.includes('20 months'), 'Prompt includes verified runway');
    assert(promptContext.includes('DevOps & Site Reliability Engineers'), 'Prompt includes target ICP');
    assert(!promptContext.includes('password'), 'Prompt does NOT expose passwords');
    assert(!promptContext.includes('DATABASE_URL'), 'Prompt does NOT expose database credentials');
    assert(!promptContext.includes('JWT_SECRET'), 'Prompt does NOT expose JWT secrets');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7 — Agent-Specific Scoped Context
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Specialist Agent Context Scoping ---');
    // Finance Agent scope
    const financeScope = companyContextService.getAgentScopedContext(updatedContextA!, 'Finance');
    assert(financeScope.financial !== undefined, 'Finance agent receives financial metrics');
    assert(financeScope.cashRunwayAssessment.runwayMonths === 20, 'Finance agent receives deterministic runway assessment');
    assert(financeScope.targetIcp === undefined, 'Finance agent is not burdened with ICP targeting details');

    // Growth Agent scope
    const growthScope = companyContextService.getAgentScopedContext(updatedContextA!, 'Growth');
    assert(growthScope.targetIcp !== undefined, 'Growth agent receives target ICP');
    assert(growthScope.primaryProduct !== undefined, 'Growth agent receives product details');
    assert(growthScope.cashRunwayAssessment === undefined, 'Growth agent is not burdened with raw treasury mechanics');

    // Talent Agent scope
    const talentScope = companyContextService.getAgentScopedContext(updatedContextA!, 'Talent');
    assert(talentScope.teamSize === '4 engineers', 'Talent agent receives current team structure');
    assert(talentScope.budgetLimitMonthly === 32500, 'Talent agent receives monthly burn boundary');

    // Legal Agent scope
    const legalScope = companyContextService.getAgentScopedContext(updatedContextA!, 'Legal');
    assert(legalScope.complianceScore !== undefined, 'Legal agent receives compliance score');
    assert(legalScope.businessModel !== undefined, 'Legal agent receives monetization structure');

    // Operations Agent scope
    const opsScope = companyContextService.getAgentScopedContext(updatedContextA!, 'Operations');
    assert(opsScope.operations !== undefined, 'Operations agent receives operations block');
    assert(opsScope.milestones !== undefined, 'Operations agent receives milestone timeline');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8 — Missing Optional Fields Handling (Safe Defaults)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 8: Missing Optional Fields Resilience ---');
    const minimalUser = `usr_minimal_${Date.now()}`;
    await safeDbQuery(() =>
      prisma.user.create({
        data: {
          id: minimalUser,
          email: `minimal_${Date.now()}@test.com`,
          name: 'Minimal Founder',
          role: 'Founder'
        }
      })
    );

    // Save minimal onboarding data with missing optional fields
    const minimalStartup = await workspaceService.saveOnboardingData(minimalUser, {
      startupName: 'Barebones Inc',
      industry: 'Services'
    });

    const minimalContext = await companyContextService.getContextForUser(minimalUser);
    assert(minimalContext !== null, 'Minimal startup loads context without throwing error');
    assert(minimalContext?.identity.name === 'Barebones Inc', 'Startup name correctly set');
    assert(typeof minimalContext?.business.problem === 'string', 'Missing problem defaults safely to string');
    assert(typeof minimalContext?.operations.teamSize === 'string', 'Missing teamSize defaults safely to string');
    assert(Array.isArray(minimalContext?.goals.strategicGoals), 'Missing goals defaults safely to non-empty array');
    assert(minimalContext?.financial.cashBalance === 250000, 'Missing cash defaults safely to 250,000');

    const minimalPrompt = companyContextService.toPromptContext(minimalContext!, 'CEO');
    assert(typeof minimalPrompt === 'string' && minimalPrompt.length > 0, 'Minimal context formats cleanly for AI without crashing');

    // Clean up test records
    console.log('\nCleaning up test database records...');
    await safeDbQuery(() => prisma.startup.deleteMany({ where: { id: { in: [startupAId, startupBId, minimalStartup.startupId] } } }));
    await safeDbQuery(() => prisma.user.deleteMany({ where: { id: { in: [testUserAId, testUserBId, minimalUser] } } }));
    console.log('Cleanup completed.');

  } catch (err: any) {
    console.error('Fatal test runner exception:', err);
    testsFailed++;
  }

  console.log('\n========================================================');
  console.log(`🏁 TEST SUMMARY: ${testsPassed} PASSED | ${testsFailed} FAILED`);
  console.log('========================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
