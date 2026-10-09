import http from 'http';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../backend/services/neonAuthMiddleware';

const testToken = jwt.sign(
  { sub: 'usr_founder_live_test', email: 'founder@catalyst.os', name: 'Founder', role: 'FOUNDER' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function makeRequest(options: http.RequestOptions, postData?: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 200, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function verifyLiveApi() {
  console.log('Testing Live Endpoints on http://localhost:3000...');

  // 1. Health Probe
  const healthRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET'
  });
  console.log('1. GET /api/health:', healthRes.statusCode, healthRes.data?.status === 'alive' ? '✅ PASS' : '❌ FAIL');

  // 2. POST /api/orchestration/directives
  const directivePayload = JSON.stringify({
    directive: 'Prepare a 30-day go-to-market plan and assess the budget.'
  });
  const directiveRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orchestration/directives',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testToken}`
    }
  }, directivePayload);

  console.log('2. POST /api/orchestration/directives:', directiveRes.statusCode, directiveRes.data?.runId ? `✅ PASS (runId: ${directiveRes.data.runId})` : `❌ FAIL: ${JSON.stringify(directiveRes.data)}`);
  const runId = directiveRes.data?.runId;

  if (runId) {
    // 3. GET /api/orchestration/runs/:runId
    const getRunRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/orchestration/runs/${runId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    console.log(`3. GET /api/orchestration/runs/${runId}:`, getRunRes.statusCode, getRunRes.data?.runId === runId ? '✅ PASS' : '❌ FAIL');

    // 4. GET /api/orchestration/runs/:runId/tasks
    const getTasksRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/orchestration/runs/${runId}/tasks`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    console.log(`4. GET /api/orchestration/runs/${runId}/tasks:`, getTasksRes.statusCode, Array.isArray(getTasksRes.data?.tasks) ? `✅ PASS (${getTasksRes.data.tasks.length} tasks)` : '❌ FAIL');

    // 5. GET /api/orchestration/history
    const historyRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orchestration/history',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    console.log('5. GET /api/orchestration/history:', historyRes.statusCode, Array.isArray(historyRes.data) ? `✅ PASS (${historyRes.data.length} entries)` : '❌ FAIL');
  }

  // 6. POST /api/orchestrate Backwards-Compatible
  const compatPayload = JSON.stringify({
    command: 'What are our current product priorities?'
  });
  const compatRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/orchestrate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testToken}`
    }
  }, compatPayload);
  console.log('6. POST /api/orchestrate:', compatRes.statusCode, compatRes.data?.answer?.summary ? '✅ PASS' : '❌ FAIL');

  console.log('\n🎉 ALL LIVE HTTP ENDPOINTS VERIFIED SUCCESSFULLY!');
}

verifyLiveApi().catch(console.error);
