/**
 * CatalystOS — Phase A6 test suite: Missing AI Capability Handling vs Human Staffing Requirements.
 *
 * Requirements:
 * 1. Missing AI specialist:
 *    Required capability -> Check existing agents -> (If NO: Provision AI capability) -> Continue task.
 * 2. Crucial Rule: Do not automatically invent a human employee.
 * 3. For humans:
 *    Missing human responsibility -> Create role/task requirement -> Founder/Admin assigns or invites person.
 * 4. Multi-tenant isolation for provisioned agents and human requirements.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../backend/services/dbService';
import { ensureMembership } from '../backend/services/membershipService';
import { createInvitation } from '../backend/services/invitationService';
import {
  ensureAiSpecialistCapability,
  resolveHumanRoleRequirement,
  getHumanRoleRequirementsForStartup,
  getMissingCapabilitiesAndStaffing,
  delegateWorkOrders,
  decomposeCommandToPlan,
  assignTaskForUser,
  ownerRoleForDepartment,
  agentForDepartment,
  TaskDelegationError
} from '../backend/services/taskDelegationService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${title} - ${details || 'Assertion failed'}`);
    failed++;
  }
}

const stamp = Date.now();
const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
const createdUserIds: string[] = [];
const createdStartupIds: string[] = [];

async function makeUser(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `a6_${label}_${stamp}@test.catalyst`,
      name: `A6 ${label}`,
      role: 'Founder',
      passwordHash: await hashPassword('a6pass123')
    }
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeCompany(label: string) {
  const owner = await makeUser(`owner_${label}`);
  const startup = await prisma.startup.create({
    data: {
      name: `A6 Co ${label} ${stamp}`,
      industry: 'Artificial Intelligence',
      description: 'Phase A6 capability testing startup',
      ownerId: owner.id
    }
  });
  createdStartupIds.push(startup.id);
  await ensureMembership(owner.id, startup.id, 'FOUNDER');
  return { owner, startup };
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('  PHASE A6 — MISSING AI CAPABILITY HANDLING & HUMAN STAFFING REQUIREMENTS');
  console.log('========================================================================');

  let dbUp = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbUp = false; }
  if (!dbUp) {
    console.log('\n  ⚠ Database unreachable — skipping integration tests.');
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    return;
  }

  const companyA = await makeCompany('A');
  const companyB = await makeCompany('B');

  // ── [1] AI Capability: Check Existing Agents & Provision if Missing ─────────
  console.log('\n[1] AI Capability: Check Existing Agents & Auto-Provision Missing');

  // Verify companyA starts with 0 executive agents
  const initialAgentsCount = await (prisma as any).executiveAgent.count({
    where: { startupId: companyA.startup.id }
  });
  assert(initialAgentsCount === 0, 'Company A starts with 0 executive agents');

  // Check & Provision LEGAL capability (Nexus)
  const legalCap = await ensureAiSpecialistCapability(companyA.startup.id, 'LEGAL');
  assert(legalCap.provisioned === true, 'Missing LEGAL capability was provisioned');
  assert(legalCap.agentRole === 'Legal', 'Provisioned agent role is Legal');
  assert(legalCap.agentName === 'Nexus', 'Provisioned agent name is Nexus');
  assert(Boolean(legalCap.agentId), 'Provisioned agent received a database ID');

  // Verify row really exists in prisma.executiveAgent
  const legalRow = await (prisma as any).executiveAgent.findUnique({
    where: { id: legalCap.agentId }
  });
  assert(Boolean(legalRow), 'ExecutiveAgent row exists in database');
  assert(legalRow.startupId === companyA.startup.id, 'Provisioned agent is scoped to Company A');
  assert(legalRow.status === 'idle', 'Provisioned agent starts with idle status');

  // Calling ensureAiSpecialistCapability again for LEGAL should NOT create a duplicate
  const secondCheck = await ensureAiSpecialistCapability(companyA.startup.id, 'LEGAL');
  assert(secondCheck.provisioned === false, 'Existing LEGAL capability is reused without re-provisioning');
  assert(secondCheck.agentId === legalCap.agentId, 'Reused agent ID matches existing agent');

  const afterLegalCount = await (prisma as any).executiveAgent.count({
    where: { startupId: companyA.startup.id }
  });
  assert(afterLegalCount === 1, 'No duplicate agent row was created for Company A');

  // ── [2] Extensible & Dynamic Capabilities ──────────────────────────────────
  console.log('\n[2] Extensible AI Capabilities (Security, Data, Custom)');

  // Provision Security capability (Aegis)
  const secCap = await ensureAiSpecialistCapability(companyA.startup.id, 'SECURITY');
  assert(secCap.provisioned === true, 'SECURITY capability provisioned as new agent');
  assert(secCap.agentRole === 'Security', 'Security agent role is Security');
  assert(secCap.agentName === 'Aegis', 'Security agent name is Aegis');

  // Provision Data capability (Cipher)
  const dataCap = await ensureAiSpecialistCapability(companyA.startup.id, 'DATA');
  assert(dataCap.provisioned === true, 'DATA capability provisioned as new agent');
  assert(dataCap.agentRole === 'Data', 'Data agent role is Data');
  assert(dataCap.agentName === 'Cipher', 'Data agent name is Cipher');

  // Provision a novel/custom capability
  const customCap = await ensureAiSpecialistCapability(companyA.startup.id, 'DEVOPS');
  assert(customCap.provisioned === true, 'Novel DEVOPS capability provisioned dynamically');
  assert(customCap.agentRole === 'Devops', 'Dynamic agent role normalized to Devops');

  // ── [3] Continue Task With Provisioned AI Capability ───────────────────────
  console.log('\n[3] Tasks Continue Seamlessly with Provisioned AI Agents');

  // Delegate work order requiring Talent and Operations
  const workOrders = [
    { department: 'TALENT', objective: 'Source Senior ML Systems Engineer candidates' },
    { department: 'OPERATIONS', objective: 'Provision cloud dev clusters and staging compute' }
  ];

  const delegated = await delegateWorkOrders(companyA.startup.id, workOrders);
  assert(delegated.length === 2, 'Work orders successfully delegated into tasks');

  const talentTask = delegated.find(t => t.department === 'TALENT');
  assert(talentTask?.agent === 'Talent', 'Talent task names Echo/Talent assisting agent');
  assert(talentTask?.status === 'pending', 'Talent task starts in pending state');

  // Verify Talent and Operations agents were auto-provisioned during delegation
  const talentAgentInDb = await (prisma as any).executiveAgent.findFirst({
    where: { startupId: companyA.startup.id, role: 'Talent' }
  });
  assert(Boolean(talentAgentInDb), 'Talent agent (Echo) auto-provisioned during delegation');

  const opsAgentInDb = await (prisma as any).executiveAgent.findFirst({
    where: { startupId: companyA.startup.id, role: 'Operations' }
  });
  assert(Boolean(opsAgentInDb), 'Operations agent (Helix) auto-provisioned during delegation');

  // ── [4] Human Responsibility: NEVER Invent a Human Employee ────────────────
  console.log('\n[4] Missing Human Responsibility: Never Invent a Human Employee');

  const userCountBefore = await prisma.user.count();
  const membershipCountBefore = await prisma.membership.count();

  // Create a plan with a LEGAL task (which has ownerRole === null)
  const hiringPlan = await decomposeCommandToPlan({
    startupId: companyA.startup.id,
    command: 'Prepare an employment offer contract for a lead engineer.'
  });

  const userCountAfter = await prisma.user.count();
  const membershipCountAfter = await prisma.membership.count();

  // CRITICAL RULE VERIFICATION: Zero invented employees!
  assert(userCountBefore === userCountAfter, 'Zero human users invented in database');
  assert(membershipCountBefore === membershipCountAfter, 'Zero human memberships invented in database');

  const legalTask = hiringPlan.tasks.find(t => t.department === 'LEGAL');
  assert(Boolean(legalTask), 'Legal task generated in plan');
  assert(legalTask?.ownerRole === null, 'Legal task has no human employee owner role');
  assert(legalTask?.needsHumanOwner === true, 'Legal task explicitly flagged with needsHumanOwner: true');

  // Verify structured HumanRoleRequirement was generated
  const legalReq = legalTask?.humanRequirement;
  assert(Boolean(legalReq), 'HumanRoleRequirement attached to Legal task');
  assert(legalReq?.status === 'UNFILLED', 'Legal requirement is UNFILLED');
  assert(legalReq?.actionRequired === 'ASSIGN_EXISTING', 'Action required is ASSIGN_EXISTING');
  assert(legalReq?.reason.includes('No placeholder employee is invented') || legalReq?.reason.includes('Never inventing'), 'Reason explicitly notes no placeholder employee invented');
  assert(Array.isArray(legalReq?.suggestedAction.assignableUsers), 'Provides assignable users list');
  assert(legalReq?.suggestedAction.assignableUsers?.some(u => u.userId === companyA.owner.id), 'Founder is available as assignable user');

  // Case 2: HR department task when company has NO employee with HR role
  const hrTask = hiringPlan.tasks.find(t => t.department === 'TALENT');
  assert(Boolean(hrTask), 'Talent/HR task generated in plan');
  // Company A only has Founder, so HR role is unfilled by any employee
  const hrReq = await resolveHumanRoleRequirement({ startupId: companyA.startup.id, task: hrTask! });
  assert(Boolean(hrReq), 'HumanRoleRequirement generated for unfilled HR role');
  assert(hrReq?.actionRequired === 'INVITE_PERSON', 'Action required is INVITE_PERSON when role has no employees');
  assert(hrReq?.missingRole === 'HR', 'Identifies HR as missing employee role');
  assert(hrReq?.suggestedAction.recommendedInviteRole === 'HR', 'Recommends inviting a colleague with HR role');

  // ── [5] Founder/Admin Assigns Existing Person or Invites ───────────────────
  console.log('\n[5] Founder/Admin Assigns Member or Invites Person');

  // Founder assigns themselves to the Legal task
  const assignedTask = await assignTaskForUser({
    userId: companyA.owner.id,
    taskId: legalTask!.id,
    assigneeId: companyA.owner.id
  });

  assert(assignedTask.assignedUserId === companyA.owner.id, 'Task assigned to Founder');
  assert(assignedTask.assignedUserName === companyA.owner.name, 'Assigned user name resolved');
  assert(assignedTask.needsHumanOwner === false, 'needsHumanOwner updated to false after assignment');

  // Requirement is now resolved
  const reqAfterAssign = await resolveHumanRoleRequirement({
    startupId: companyA.startup.id,
    task: assignedTask
  });
  assert(reqAfterAssign === null, 'Human requirement resolved after founder assignment');

  // For the unfilled HR role, Founder invites an HR Lead
  const created = await createInvitation({
    startupId: companyA.startup.id,
    invitedById: companyA.owner.id,
    email: `hr_lead_${stamp}@test.catalyst`,
    role: 'HR'
  });
  assert(created.invitation.status === 'PENDING', 'Founder created invitation for missing HR role');
  assert(created.invitation.role === 'HR', 'Invitation is for HR role');

  // ── [6] Multi-tenant Isolation ─────────────────────────────────────────────
  console.log('\n[6] Multi-Tenant Isolation for Provisioned Capabilities');

  // Company B agents count should be 0 (Company A provisioning must not leak to Company B)
  const companyBAgentsCount = await (prisma as any).executiveAgent.count({
    where: { startupId: companyB.startup.id }
  });
  assert(companyBAgentsCount === 0, 'Company B has 0 agents (zero leak from Company A)');

  // Company B tasks & requirements diagnostic
  const diagB = await getMissingCapabilitiesAndStaffing(companyB.startup.id);
  assert(diagB.aiSpecialists.length === 0, 'Company B diagnostic shows 0 AI specialists');

  // Provisioning for Company B is isolated
  const bLegalCap = await ensureAiSpecialistCapability(companyB.startup.id, 'LEGAL');
  assert(bLegalCap.provisioned === true, 'Company B provisions its own Legal specialist');
  assert(bLegalCap.agentId !== legalCap.agentId, 'Company B agent has distinct ID from Company A');

  // ── Cleanup ───────────────────────────────────────────────────────────────
  try {
    for (const sid of createdStartupIds) {
      await (prisma as any).task.deleteMany({ where: { plan: { startupId: sid } } });
      await (prisma as any).plan.deleteMany({ where: { startupId: sid } });
      await (prisma as any).executiveAgent.deleteMany({ where: { startupId: sid } });
      await (prisma as any).membership.deleteMany({ where: { startupId: sid } });
      await (prisma as any).invitation.deleteMany({ where: { startupId: sid } });
      await (prisma as any).startup.delete({ where: { id: sid } });
    }
    for (const uid of createdUserIds) {
      await prisma.user.delete({ where: { id: uid } });
    }
  } catch (err: any) {
    console.warn('  Cleanup note:', err.message);
  }

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error in A6 test suite:', err);
  process.exit(1);
});
