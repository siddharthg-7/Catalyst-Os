/**
 * CatalystOS - Test Suite: Agent Rule Engine & Founder Activity Ledger
 * Tests Module 3 (Persistent Multi-Agent Store & Dynamic Rule Engine)
 * and Module 6 (Founder Activity Recording & Real-Time Audit Inspection Surface).
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { agentRuleService } from '../backend/services/agentRuleService';
import { activityLogService } from '../backend/services/activityLogService';

const TEST_STARTUP_ID = 'stp_rule_test_' + Date.now();
const TEST_STARTUP_ID_B = 'stp_rule_test_b_' + Date.now();

test('AgentRuleService [Test 1]: Default Rules & Spend Limits for All Personas', async () => {
  const cfoRules = await agentRuleService.getRulesForAgent(TEST_STARTUP_ID, 'CFO');
  assert.strictEqual(cfoRules.agentRole, 'CFO');
  assert.ok(cfoRules.rules.length >= 2, 'CFO must have default rules');
  assert.ok(cfoRules.rules.some(r => r.includes('runway') || r.includes('fiduciary') || r.includes('governance')));
  assert.strictEqual(cfoRules.spendLimit, 5000, 'Default CFO spend limit is $5000');

  const ceoRules = await agentRuleService.getRulesForAgent(TEST_STARTUP_ID, 'CEO');
  assert.strictEqual(ceoRules.agentRole, 'CEO');
  assert.ok(ceoRules.rules.length >= 2, 'CEO must have default rules');

  const auditorRules = await agentRuleService.getRulesForAgent(TEST_STARTUP_ID, 'AUDITOR');
  assert.strictEqual(auditorRules.agentRole, 'AUDITOR');
  assert.ok(auditorRules.rules.some(r => r.includes('hallucination') || r.includes('citation') || r.includes('fact')));

  console.log('✅ PASS: Test 1 - Default rules & spend limits initialized for all executive personas');
});

test('AgentRuleService [Test 2]: Dynamic Rule Modification without Server Restart', async () => {
  const customRules = [
    'Always preserve a mandatory 18-month runway buffer for enterprise resilience.',
    'Require 3 vendor quotes for any software purchase exceeding $1,000.',
    'Mandate ESG and carbon footprint checks on cloud compute workloads.'
  ];

  const updated = await agentRuleService.updateRulesForAgent({
    startupId: TEST_STARTUP_ID,
    role: 'CFO',
    rules: customRules,
    spendLimit: 7500,
    actorId: 'usr_founder_audit_test'
  });

  assert.strictEqual(updated.agentRole, 'CFO');
  assert.strictEqual(updated.rules.length, 3);
  assert.strictEqual(updated.spendLimit, 7500);
  assert.deepStrictEqual(updated.rules, customRules);

  // Retrieve again to ensure persistence
  const retrieved = await agentRuleService.getRulesForAgent(TEST_STARTUP_ID, 'CFO');
  assert.deepStrictEqual(retrieved.rules, customRules);
  assert.strictEqual(retrieved.spendLimit, 7500);

  // Verify prompt formatting includes newly injected rules
  const promptText = await agentRuleService.formatRulesPrompt(TEST_STARTUP_ID, 'CFO');
  assert.ok(promptText.includes('18-month runway buffer'), 'Formatted prompt contains custom rule 1');
  assert.ok(promptText.includes('Require 3 vendor quotes'), 'Formatted prompt contains custom rule 2');
  assert.ok(promptText.includes('$7,500'), 'Formatted prompt contains updated spend limit');

  console.log('✅ PASS: Test 2 - Dynamic rule customization and instant prompt injection verified');
});

test('AgentRuleService [Test 3]: Tenant Isolation on Custom Agent Rules', async () => {
  // Tenant B should NOT see Tenant A's customized rules
  const tenantBRules = await agentRuleService.getRulesForAgent(TEST_STARTUP_ID_B, 'CFO');
  assert.strictEqual(tenantBRules.spendLimit, 5000, 'Tenant B maintains its own default spend limit');
  assert.ok(!tenantBRules.rules.some(r => r.includes('18-month runway buffer')), 'Tenant B is isolated from Tenant A rules');

  console.log('✅ PASS: Test 3 - Multi-tenant isolation enforced for agent rules');
});

test('ActivityLogService [Test 4]: Audit Logging for Employee and Agent Actions', async () => {
  const claimLog = await activityLogService.logActivity({
    startupId: TEST_STARTUP_ID,
    userId: 'usr_employee_hr_1',
    actorRole: 'HR',
    action: 'TASK_CLAIMED',
    targetEntity: 'TASK',
    targetId: 'task_recruiting_backend_lead',
    department: 'TALENT',
    details: {
      taskTitle: 'Recruit Senior Backend Architect',
      candidateCount: 4
    }
  });

  assert.ok(claimLog.id.startsWith('act_'), 'Activity log ID formatted correctly');
  assert.strictEqual(claimLog.action, 'TASK_CLAIMED');
  assert.strictEqual(claimLog.actorRole, 'HR');
  assert.strictEqual(claimLog.department, 'TALENT');

  const submitLog = await activityLogService.logActivity({
    startupId: TEST_STARTUP_ID,
    userId: 'usr_employee_hr_1',
    actorRole: 'HR',
    action: 'TASK_SUBMITTED',
    targetEntity: 'TASK',
    targetId: 'task_recruiting_backend_lead',
    department: 'TALENT',
    details: {
      taskTitle: 'Recruit Senior Backend Architect',
      resultPreview: 'Selected candidate Priya Nair with $125k base compensation package.'
    }
  });

  assert.strictEqual(submitLog.action, 'TASK_SUBMITTED');

  const approvalLog = await activityLogService.logActivity({
    startupId: TEST_STARTUP_ID,
    userId: 'usr_founder_lead',
    actorRole: 'FOUNDER',
    action: 'APPROVAL_GRANTED',
    targetEntity: 'DELIVERABLE',
    targetId: 'deliv_backend_offer_letter',
    department: 'EXECUTIVE',
    details: {
      approvalTitle: 'Priya Nair Offer Sign-off',
      feedback: 'Approved based on CFO runway clearance.'
    }
  });

  assert.strictEqual(approvalLog.action, 'APPROVAL_GRANTED');
  assert.strictEqual(approvalLog.actorRole, 'FOUNDER');

  console.log('✅ PASS: Test 4 - Employee task claim, submission, and founder approval activity logged');
});

test('ActivityLogService [Test 5]: Real-Time Feed Query with Department, Employee, and Action Filters', async () => {
  // Query all activities for startup
  const allLogs = await activityLogService.listActivities({
    startupId: TEST_STARTUP_ID
  });
  assert.ok(allLogs.length >= 3, 'All logged activities retrieved');

  // Filter by department = TALENT
  const talentLogs = await activityLogService.listActivities({
    startupId: TEST_STARTUP_ID,
    department: 'TALENT'
  });
  assert.ok(talentLogs.length >= 2, 'TALENT department filter works');
  assert.ok(talentLogs.every(l => l.department === 'TALENT'), 'All returned logs belong to TALENT');

  // Filter by action = APPROVAL_GRANTED
  const approvalLogs = await activityLogService.listActivities({
    startupId: TEST_STARTUP_ID,
    action: 'APPROVAL_GRANTED'
  });
  assert.strictEqual(approvalLogs.length, 1, 'Action filter matches APPROVAL_GRANTED');
  assert.strictEqual(approvalLogs[0].actorRole, 'FOUNDER');

  // Filter by employee = usr_employee_hr_1
  const hrLogs = await activityLogService.listActivities({
    startupId: TEST_STARTUP_ID,
    userId: 'usr_employee_hr_1'
  });
  assert.ok(hrLogs.length >= 2, 'Employee filter matches usr_employee_hr_1');

  console.log('✅ PASS: Test 5 - Real-time activity feed filtering by Department, Employee, and Action verified');
});
