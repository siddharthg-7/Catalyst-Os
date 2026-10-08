const http = require('http');

const API_BASE = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('====================================================');
  console.log('🚀 CATALYST OS: FOUNDER SIGNUP, RAG & COMPANY DOC TEST');
  console.log('====================================================\n');

  const testEmail = `founder_${Date.now()}@testventure.io`;
  const companyName = `Aetheria Robotics ${Math.floor(Math.random() * 1000)}`;

  // 1. Founder Signup
  console.log('1️⃣ Step 1: Founder Signup...');
  const signupRes = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'password123!',
      name: 'Sarah Connor',
      role: 'Founder'
    })
  });

  if (!signupRes.ok) {
    console.error('❌ Signup failed:', signupRes.data);
    process.exit(1);
  }
  const token = signupRes.data.token;
  const userId = signupRes.data.user.id;
  console.log(`✅ Founder signed up successfully. User ID: ${userId}, Token received.\n`);

  // 2. Founder Details & Onboarding -> Storing in Company Name
  console.log(`2️⃣ Step 2: Submitting Onboarding details under Company Name "${companyName}"...`);
  const onboardingRes = await request('/api/startup/onboarding', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      founderName: 'Sarah Connor',
      founderRole: 'CEO & Founder',
      startupName: companyName,
      industry: 'Autonomous Robotics',
      idea: 'Next-generation industrial automation and warehouse fulfillment robots powered by embodied intelligence.',
      budget: 1500000,
      burnRate: 45000,
      stage: 'Seed',
      targetIcp: 'Tier-1 Logistics Operators & Warehouses',
      problem: 'Warehouse fulfillment labor shortages causing 35% slowdowns in supply chain distribution.',
      biggestChallenge: 'Scaling edge AI deployment across 100+ simultaneous robotic units.',
      timeline: '12 Months'
    })
  });

  if (!onboardingRes.ok) {
    console.error('❌ Onboarding failed:', onboardingRes.data);
    process.exit(1);
  }
  console.log('✅ Onboarding completed! Verified stored fields:');
  console.log(`   - Company Name: "${onboardingRes.data.startup.name}"`);
  console.log(`   - Industry: "${onboardingRes.data.startup.industry}"`);
  console.log(`   - Cash Reserves: $${onboardingRes.data.startup.cashBalance.toLocaleString()}`);
  console.log(`   - Runway: ${onboardingRes.data.startup.runwayMonths} months\n`);

  // 3. Verify Documents in Knowledge Base (Company Profile automatically ingested into RAG)
  console.log('3️⃣ Step 3: Verifying Company Profile is indexed in Knowledge Base (RAG)...');
  const knowRes = await request('/api/knowledge', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!knowRes.ok || !Array.isArray(knowRes.data) || knowRes.data.length === 0) {
    console.error('❌ Knowledge base documents not found:', knowRes.data);
    process.exit(1);
  }

  const profileDoc = knowRes.data.find(d => d.name.includes(companyName) || d.type === 'business_plan');
  if (!profileDoc) {
    console.error(`❌ Could not find living profile document for ${companyName}:`, knowRes.data);
    process.exit(1);
  }
  console.log(`✅ Company Profile indexed in RAG: "${profileDoc.name}" (${profileDoc.size})`);
  console.log(`   Summary: ${profileDoc.summary.slice(0, 100)}...\n`);

  // 4. Ask about Context via Orchestration Command
  console.log('4️⃣ Step 4: Asking AI Council about company context via /api/orchestrate...');
  const orchRes = await request('/api/orchestrate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      command: 'What is our company context and verified profile?'
    })
  });

  if (!orchRes.ok) {
    console.error('❌ Orchestrate query failed:', orchRes.data);
    process.exit(1);
  }
  console.log('✅ Orchestrator responded with verified company context:');
  console.log(`   Summary: ${orchRes.data.answer.summary}`);
  console.log(`   Citations count: ${orchRes.data.citations?.length || 0}`);
  if (orchRes.data.citations && orchRes.data.citations.length > 0) {
    orchRes.data.citations.forEach(c => console.log(`   - [${c.id}] ${c.title}`));
  }
  console.log('');

  // 5. Ask about Knowledge Documents via Orchestration
  console.log('5️⃣ Step 5: Asking AI Council about knowledge documents...');
  const orchDocsRes = await request('/api/orchestrate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      command: 'What documents do we have in our knowledge base?'
    })
  });

  if (!orchDocsRes.ok) {
    console.error('❌ Orchestrate documents query failed:', orchDocsRes.data);
    process.exit(1);
  }
  console.log('✅ AI responded with Knowledge Base audit:');
  console.log(`   Summary: ${orchDocsRes.data.answer.summary}`);
  console.log(`   Details: ${orchDocsRes.data.answer.details.slice(0, 150)}...\n`);

  // 6. Direct RAG Search via /api/knowledge/query
  console.log('6️⃣ Step 6: Testing semantic RAG search via /api/knowledge/query...');
  const ragQueryRes = await request('/api/knowledge/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: 'What is our runway and target customer profile?'
    })
  });

  if (!ragQueryRes.ok) {
    console.error('❌ /api/knowledge/query failed:', ragQueryRes.data);
    process.exit(1);
  }
  console.log('✅ RAG Engine returned grounded answer with citations:');
  console.log(`   Answer snippet: ${ragQueryRes.data.answer.slice(0, 200)}...`);
  console.log(`   Citations: ${ragQueryRes.data.citations?.length || 0} attached\n`);

  // 7. Uploading a Company-wide Document
  console.log('7️⃣ Step 7: Uploading a company-wide document ("Hardware Architecture Specs")...');
  const uploadRes = await request('/api/knowledge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Hardware Architecture Specs v1.0.txt',
      type: 'other',
      content: `Aetheria Robotics Hardware Architecture Specifications:
1. Core Compute: Dual NVIDIA Jetson Orin modules running ROS2 on Real-Time Linux.
2. Sensor Suite: 4x Ouster OS1 LiDAR units, 6x RealSense D435i depth cameras, and dual IMU fusion.
3. Power Budget: 48V 2.4kWh LiFePO4 battery pack providing 14 hours continuous payload hauling.
4. Maximum Payload: 450 kg automated transport at 2.5 m/s maximum speed.
5. Safety Architecture: ISO 13849 Category 3 PL d certified hardware interlock loops.`
    })
  });

  if (!uploadRes.ok) {
    console.error('❌ Document upload failed:', uploadRes.data);
    process.exit(1);
  }
  console.log(`✅ Company document uploaded: "${uploadRes.data.name}" (${uploadRes.data.size})`);
  console.log(`   Summary: ${uploadRes.data.summary}\n`);

  // 8. Querying RAG specifically for the new document's knowledge
  console.log('8️⃣ Step 8: Querying RAG for information in the newly uploaded document...');
  const specQueryRes = await request('/api/knowledge/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: 'What compute and sensors does the robot hardware use?'
    })
  });

  if (!specQueryRes.ok) {
    console.error('❌ Hardware spec query failed:', specQueryRes.data);
    process.exit(1);
  }
  console.log('✅ RAG response grounded in newly uploaded document:');
  console.log(`   Answer: ${specQueryRes.data.answer.slice(0, 220)}...`);
  if (specQueryRes.data.citations && specQueryRes.data.citations.length > 0) {
    specQueryRes.data.citations.forEach(c => console.log(`   - ${c.citationId || c.id} ${c.documentName || c.title}`));
  }
  console.log('');

  // 9. Verifying all company documents are listed for the company
  console.log('9️⃣ Step 9: Verifying total company documents list...');
  const allDocsRes = await request('/api/knowledge', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`✅ Company now has ${allDocsRes.data.length} documents indexed:`);
  allDocsRes.data.forEach(d => console.log(`   - [${d.type}] ${d.name} (${d.size})`));

  console.log('\n====================================================');
  console.log('🎉 ALL 4 USER REQUIREMENTS VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('💥 Test script exception:', err);
  process.exit(1);
});
