/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma, safeDbQuery } from '../backend/services/dbService';
import {
  listCompanyMeetings,
  createCompanyMeeting,
  cancelCompanyMeeting,
  isValidMeetingUrl,
  getUserAvailability,
  setUserAvailability,
  listEmployeeProjects,
  listActivityFeed,
  addTaskCollaborator,
  addTaskProgressUpdate,
  listTaskProgressUpdates,
  listDomainExperts
} from '../backend/services/employeeEcosystemService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runEcosystemTests() {
  console.log('\n========================================================================');
  console.log('  EMPLOYEE ECOSYSTEM AUTOMATED TEST SUITE');
  console.log('========================================================================\n');

  if (!prisma) {
    console.warn('Database is unavailable; skipping tests');
    return;
  }

  // 1. URL validation tests
  console.log('--- 1. Meeting URL Validation ---');
  assert(isValidMeetingUrl('https://meet.google.com/abc-defg-hij'), 'Google Meet URL is valid');
  assert(isValidMeetingUrl('https://teams.microsoft.com/l/meetup-join/123'), 'Microsoft Teams URL is valid');
  assert(isValidMeetingUrl('https://zoom.us/j/123456789'), 'Zoom URL is valid');
  assert(!isValidMeetingUrl('http://insecure-site.com'), 'Insecure HTTP URL is rejected');
  assert(!isValidMeetingUrl('javascript:alert(1)'), 'Dangerous scheme is rejected');

  // Create isolated test user & startup
  const testUser: any = await (prisma as any).user.create({
    data: {
      email: `rohan_${Date.now()}@kitepay.in`,
      name: 'Rohan Mehta',
      role: 'DEVELOPER'
    }
  });

  const testStartup: any = await (prisma as any).startup.create({
    data: {
      name: 'KitePay Technologies India',
      industry: 'FinTech / Payments Infrastructure',
      description: 'Unified UPI 2.0 Recurring Autopay Engine for D2C Brands',
      cashBalance: 8500000,
      burnRate: 750000,
      ownerId: testUser.id
    }
  });

  const testLead: any = await (prisma as any).user.create({
    data: {
      email: `priya_${Date.now()}@kitepay.in`,
      name: 'Priya Sundaram',
      role: 'LEAD'
    }
  });

  await (prisma as any).membership.create({
    data: {
      userId: testUser.id,
      startupId: testStartup.id,
      role: 'OPERATIONS',
      status: 'ACTIVE'
    }
  });

  await (prisma as any).membership.create({
    data: {
      userId: testLead.id,
      startupId: testStartup.id,
      role: 'OPERATIONS',
      status: 'ACTIVE'
    }
  });

  // 2. User Availability Tests
  console.log('\n--- 2. User Availability Status ---');
  const initialAvail = await getUserAvailability(testUser.id);
  assert(Boolean(initialAvail.status), 'Default availability returned');

  const updatedAvail = await setUserAvailability({
    userId: testUser.id,
    status: 'FOCUS',
    statusText: 'Executing Mandates API Integration'
  });
  assert(updatedAvail.status === 'FOCUS', 'Availability updated to FOCUS');
  assert(updatedAvail.statusText === 'Executing Mandates API Integration', 'Custom status text persisted');

  // 3. Meeting Coordination Tests
  console.log('\n--- 3. Company Meeting Coordination ---');
  const initialMeetings = await listCompanyMeetings(testUser.id);
  assert(Array.isArray(initialMeetings.upcoming), 'Upcoming meetings list returned');

  const now = new Date();
  const startTime = new Date(now.getTime() + 60 * 60000).toISOString();
  const endTime = new Date(now.getTime() + 90 * 60000).toISOString();

  const createdMeeting = await createCompanyMeeting({
    userId: testUser.id,
    title: 'UPI 2.0 Recurring Mandates Architecture Sync',
    purpose: 'Review callback webhooks, HMAC-SHA256 signature verification, and pre-debit notifications.',
    startTime,
    endTime,
    timezone: 'IST (UTC+5:30)',
    joinUrl: 'https://meet.google.com/eng-standup-blr',
    projectName: 'UPI 2.0 Recurring Mandates Integration',
    attendeeIds: [testLead.id]
  });

  assert(Boolean(createdMeeting.id), 'Meeting created with unique ID');
  assert(createdMeeting.joinUrl === 'https://meet.google.com/eng-standup-blr', 'Join URL correctly preserved');
  assert(createdMeeting.attendees.length >= 2, 'Invited attendees included');

  const refreshedMeetings = await listCompanyMeetings(testUser.id);
  const found = refreshedMeetings.upcoming.find(m => m.id === createdMeeting.id);
  assert(Boolean(found), 'Created meeting listed under upcoming meetings');

  // Cancel meeting
  const cancelled = await cancelCompanyMeeting(testUser.id, createdMeeting.id);
  assert(cancelled === true, 'Meeting successfully cancelled');

  // 4. Project Contributions Tests
  console.log('\n--- 4. Project Contributions ---');
  const projects = await listEmployeeProjects(testUser.id);
  assert(projects.length > 0, 'Project contributions returned');
  assert(projects[0].progressPercentage >= 0 && projects[0].progressPercentage <= 100, 'Project progress percentage is calculated within 0-100');

  // 5. Activity Feed Tests
  console.log('\n--- 5. Activity Feed Timeline ---');
  const feed = await listActivityFeed(testUser.id);
  assert(feed.length > 0, 'Activity events feed populated with events');
  assert(Boolean(feed[0].title) && Boolean(feed[0].actorName), 'Activity event has title and actorName');

  // 6. Domain Experts Tests
  console.log('\n--- 6. Domain Experts Directory ---');
  const experts = await listDomainExperts(testUser.id);
  assert(experts.length >= 4, 'Domain experts roster populated with experts');
  assert(experts.some(e => e.skills.length > 0), 'Experts have domain skill tags');

  // Cleanup test entities
  console.log('\n--- Cleaning up test artifacts ---');
  try {
    await (prisma as any).membership.deleteMany({ where: { startupId: testStartup.id } });
    await (prisma as any).memory.deleteMany({ where: { startupId: testStartup.id } });
    await (prisma as any).user.delete({ where: { id: testUser.id } });
    await (prisma as any).user.delete({ where: { id: testLead.id } });
    await (prisma as any).startup.delete({ where: { id: testStartup.id } });
  } catch {}

  console.log('\n========================================================================');
  console.log('  RESULTS: ALL EMPLOYEE ECOSYSTEM TESTS PASSED SUCCESSFULLY! 🚀');
  console.log('========================================================================\n');
}

runEcosystemTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
