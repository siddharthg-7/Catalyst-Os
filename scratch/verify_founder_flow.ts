import 'dotenv/config';

async function testDeterministicFlow() {
  const BASE_URL = 'http://127.0.0.1:3000';
  console.log('🚀 === STARTING END-TO-END VERIFICATION OF FOUNDER FLOW & ISOLATION ===');

  const ts = Date.now();
  const founderAEmail = `founder_a_${ts}@test.os`;
  const founderBEmail = `founder_b_${ts}@test.os`;
  const password = 'Password123!';

  // =========================================================================
  // TEST 1: Founder A Signs Up Fresh
  // =========================================================================
  console.log('\n--- 1. Testing Founder A Sign Up ---');
  const signupARes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: founderAEmail,
      password,
      name: 'Sarah Connor',
      role: 'Founder'
    })
  });

  const signupAData = await signupARes.json();
  console.log('Sign Up Response Status:', signupARes.status);
  console.log('Sign Up onboarded status:', signupAData.onboarded);
  console.log('Sign Up startup profile:', signupAData.startup);

  if (signupARes.status !== 201 || signupAData.onboarded !== false || signupAData.startup !== null) {
    throw new Error('TEST 1 FAILED: Fresh signup should return onboarded=false and startup=null');
  }
  const tokenA = signupAData.token;
  console.log('✅ TEST 1 PASSED: Fresh founder created with onboarded=false');

  // =========================================================================
  // TEST 2: Founder A Routing Decision: Does company profile exist? -> NO
  // =========================================================================
  console.log('\n--- 2. Testing Company Profile Check (Pre-Onboarding) ---');
  const checkStartupARes = await fetch(`${BASE_URL}/api/startup`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const startupAData = await checkStartupARes.json();
  console.log('Startup profile check onboarded:', startupAData.onboarded);

  if (startupAData.onboarded !== false) {
    throw new Error('TEST 2 FAILED: Pre-onboarding startup check should return onboarded=false');
  }
  console.log('✅ TEST 2 PASSED: Routing deterministically directs to Founder Onboarding');

  // =========================================================================
  // TEST 3: Founder A Completes Onboarding (Company=X, Industry=Y, Stage=Z, etc.)
  // =========================================================================
  console.log('\n--- 3. Testing Founder Onboarding Submission ---');
  const onboardingPayloadA = {
    startupName: 'Cyberdyne Systems',
    industry: 'Autonomous Robotics',
    stage: 'Series A',
    fundingStage: 'Series A',
    description: 'Autonomous neural network processors and defense robotics platform.',
    founderName: 'Sarah Connor',
    founderRole: 'Founder & CEO',
    teamSize: '12 Engineers',
    primaryProduct: 'Skynet Neural Processor',
    targetIcp: 'Enterprise Defense Contractors',
    problem: 'Manual operational threat analysis latency',
    cashBalance: 1200000,
    monthlyBurn: 80000,
    goals: ['Deploy v1 defense prototype and secure 3 pilots'],
    biggestChallenge: 'Supply chain hardware fabrication speed',
    additionalInfo: 'Zero debt, strategic angel backing.'
  };

  const onboardingARes = await fetch(`${BASE_URL}/api/startup/onboarding`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(onboardingPayloadA)
  });

  const onboardingAData = await onboardingARes.json();
  console.log('Onboarding status:', onboardingARes.status);
  console.log('Created Startup Name:', onboardingAData.startup?.name);
  console.log('Created Cash Balance:', onboardingAData.startup?.cashBalance);
  console.log('Created Monthly Burn:', onboardingAData.startup?.burnRate);
  console.log('Created Runway Months:', onboardingAData.startup?.runwayMonths);
  console.log('Created Onboarded flag:', onboardingAData.startup?.onboarded);

  if (!onboardingAData.success || !onboardingAData.startup?.onboarded || onboardingAData.startup.name !== 'Cyberdyne Systems') {
    throw new Error('TEST 3 FAILED: Onboarding failed to save startup profile');
  }
  console.log('✅ TEST 3 PASSED: Founder onboarding completed and saved to database');

  // =========================================================================
  // TEST 4: Post-Onboarding Route Check: Does company profile exist? -> YES (Dashboard)
  // =========================================================================
  console.log('\n--- 4. Testing Post-Onboarding Routing Check ---');
  const postStartupARes = await fetch(`${BASE_URL}/api/startup`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const postStartupAData = await postStartupARes.json();
  console.log('Post-onboarding startup check onboarded:', postStartupAData.onboarded);

  if (postStartupAData.onboarded !== true || postStartupAData.name !== 'Cyberdyne Systems') {
    throw new Error('TEST 4 FAILED: Post-onboarding startup check must return onboarded=true and name=Cyberdyne Systems');
  }
  console.log('✅ TEST 4 PASSED: Routing deterministically directs to Dashboard');

  // =========================================================================
  // TEST 5: AI Grounding: "What do you know about my company?"
  // =========================================================================
  console.log('\n--- 5. Testing AI Query Grounding in Company Context ---');
  const aiRes = await fetch(`${BASE_URL}/api/orchestrate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      command: 'What do you know about my company?',
      commandId: `cmd_test_${ts}`
    })
  });

  const aiData = await aiRes.json();
  console.log('AI Response Status:', aiRes.status);
  const aiSummary = aiData.answer?.summary || '';
  const aiDetails = aiData.answer?.details || '';
  const fullAiText = `${aiSummary} ${aiDetails}`.toLowerCase();

  console.log('\n[AI Summary]:', aiSummary);
  console.log('\n[AI Details Preview]:', aiDetails.slice(0, 300) + '...');

  const hasName = fullAiText.includes('cyberdyne');
  const hasIndustry = fullAiText.includes('robotics');
  const hasStage = fullAiText.includes('series a');
  const hasCash = fullAiText.includes('1,200,000') || fullAiText.includes('1.2m') || fullAiText.includes('1200000');
  const hasBurn = fullAiText.includes('80,000') || fullAiText.includes('80k') || fullAiText.includes('80000');

  console.log('\nAI Grounding Verification:');
  console.log('- Company Name found:', hasName);
  console.log('- Industry found:', hasIndustry);
  console.log('- Stage found:', hasStage);
  console.log('- Cash Balance found:', hasCash);
  console.log('- Burn Rate found:', hasBurn);

  if (!hasName || !hasIndustry || !hasStage || !hasCash || !hasBurn) {
    throw new Error('TEST 5 FAILED: AI did not answer with all stored startup parameters!');
  }
  console.log('✅ TEST 5 PASSED: AI accurately grounded in stored founder onboarding data');

  // =========================================================================
  // TEST 6: Document Upload & Tenant Isolation
  // =========================================================================
  console.log('\n--- 6. Testing Document Upload for Founder A ---');
  const docUploadRes = await fetch(`${BASE_URL}/api/knowledge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Cyberdyne_Hardware_Specs_v1.txt',
      type: 'business_plan',
      content: 'Confidential Skynet Neural Processor specifications: 128 Teraflops compute, photonics interconnects. Budget allocation: $500,000.'
    })
  });
  const docUploadData = await docUploadRes.json();
  console.log('Uploaded Doc ID:', docUploadData.id);
  console.log('Uploaded Doc Name:', docUploadData.name);

  const docsARes = await fetch(`${BASE_URL}/api/knowledge`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const docsA = await docsARes.json();
  console.log(`Founder A has ${docsA.length} documents:`, docsA.map((d: any) => d.name));

  const uploadedDocFoundA = docsA.some((d: any) => d.name === 'Cyberdyne_Hardware_Specs_v1.txt');
  if (!uploadedDocFoundA) {
    throw new Error('TEST 6 FAILED: Uploaded document not found in Founder A knowledge base');
  }
  console.log('✅ TEST 6 PASSED: Document successfully uploaded and visible to Founder A');

  // =========================================================================
  // TEST 7: Tenant Isolation: Founder B CANNOT see Founder A documents
  // =========================================================================
  console.log('\n--- 7. Testing Tenant Isolation for Fresh Founder B ---');
  const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: founderBEmail,
      password,
      name: 'Bruce Wayne',
      role: 'Founder'
    })
  });
  const signupBData = await signupBRes.json();
  const tokenB = signupBData.token;

  // Check Founder B's documents
  const docsBRes = await fetch(`${BASE_URL}/api/knowledge`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const docsB = await docsBRes.json();
  console.log(`Founder B has ${docsB.length} documents:`, docsB.map((d: any) => d.name));

  if (docsB.length !== 0) {
    throw new Error(`TEST 7 FAILED: Founder B should have 0 documents, but saw ${docsB.length} documents! Cross-tenant leak detected.`);
  }

  // Check Founder B attempting to download Founder A's doc
  const downloadAttemptRes = await fetch(`${BASE_URL}/api/knowledge/${docUploadData.id}/download`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  console.log('Founder B download attempt HTTP status:', downloadAttemptRes.status);
  if (downloadAttemptRes.status !== 404) {
    throw new Error(`TEST 7 FAILED: Founder B should get 404 when requesting Founder A document, got ${downloadAttemptRes.status}`);
  }
  console.log('✅ TEST 7 PASSED: Zero cross-tenant leakage! Founder B cannot see or download Founder A documents');

  console.log('\n🎉 =========================================================================');
  console.log('🎉 ALL 7 DETERMINISTIC FLOW & TENANT ISOLATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('🎉 =========================================================================');
}

testDeterministicFlow().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err.message);
  process.exit(1);
});
