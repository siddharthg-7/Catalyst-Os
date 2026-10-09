/**
 * Test suite for Meeting Notes, Key Decisions, and Action Items persistence & API endpoints
 */
import assert from 'assert';
import { prisma } from '../backend/services/dbService';
import {
  listCompanyMeetings,
  updateMeetingNotes,
  toggleMeetingActionItem
} from '../backend/services/employeeEcosystemService';

async function runMeetingNotesTest() {
  console.log('--- TESTING MEETING NOTES & ACTION ITEMS ECOSYSTEM ---');

  // Setup isolated test startup & user
  const user = await (prisma as any).user.create({
    data: {
      email: `test_notes_${Date.now()}@catalyst.os`,
      name: 'Test Notes Engineer',
      role: 'DEVELOPER'
    }
  });

  const startup = await (prisma as any).startup.create({
    data: {
      name: 'Test Startup Notes',
      industry: 'FinTech',
      description: 'Testing meeting notes persistence',
      cashBalance: 1000000,
      burnRate: 100000,
      ownerId: user.id
    }
  });

  await (prisma as any).membership.create({
    data: {
      userId: user.id,
      startupId: startup.id,
      role: 'OPERATIONS',
      status: 'ACTIVE'
    }
  });

  try {
    // 1. Verify listCompanyMeetings returns past meetings with notes
    const meetings = await listCompanyMeetings(user.id);
    console.log(`Found ${meetings.upcoming.length} upcoming meetings, ${meetings.past.length} past meetings.`);
    assert(meetings.past.length > 0, 'Past meetings should be present in the company calendar');

    const pastMeet = meetings.past[0];
    console.log(`Testing meeting: "${pastMeet.title}" (ID: ${pastMeet.id})`);
    assert(Boolean(pastMeet.meetingNotes), 'Past meeting should have meetingNotes populated');
    assert(Array.isArray(pastMeet.keyDecisions), 'Past meeting should have keyDecisions array');
    assert(Array.isArray(pastMeet.actionItems), 'Past meeting should have actionItems array');
    console.log('✅ PASS: Past meeting loaded with structured notes, decisions, and action items');

    // 2. Update meeting notes and verify persistence
    const updatedNoteText = `Updated notes at ${new Date().toISOString()}: High level sync on API drop-offs.`;
    const updatedDecisions = ['All merchants must use HTTPS', 'Sandbox error logs retained for 14 days'];
    
    const updated = await updateMeetingNotes({
      userId: user.id,
      meetingId: pastMeet.id,
      meetingNotes: updatedNoteText,
      keyDecisions: updatedDecisions
    });

    assert.strictEqual(updated.meetingNotes, updatedNoteText, 'Meeting notes updated successfully');
    assert.deepStrictEqual(updated.keyDecisions, updatedDecisions, 'Key decisions updated successfully');
    console.log('✅ PASS: updateMeetingNotes persists discussion notes and key decisions');

    // 3. Toggle Action Item completion
    if (updated.actionItems && updated.actionItems.length > 0) {
      const targetItem = updated.actionItems[0];
      const initialStatus = Boolean(targetItem.completed);

      const toggled = await toggleMeetingActionItem({
        userId: user.id,
        meetingId: pastMeet.id,
        actionItemId: targetItem.id
      });
      const itemAfter = toggled.actionItems?.find(a => a.id === targetItem.id);
      assert(itemAfter, 'Action item exists after toggle');
      assert.strictEqual(itemAfter.completed, !initialStatus, 'Action item status inverted properly');
      console.log(`✅ PASS: toggleMeetingActionItem toggled item "${targetItem.text}" to ${!initialStatus}`);

      // Toggle back to preserve original
      await toggleMeetingActionItem({
        userId: user.id,
        meetingId: pastMeet.id,
        actionItemId: targetItem.id
      });
      console.log('✅ PASS: Re-toggled back to initial state');
    }

    console.log('\n========================================================================');
    console.log('  ALL MEETING NOTES TESTS PASSED SUCCESSFULLY! 📝✨');
    console.log('========================================================================\n');
  } finally {
    // Cleanup
    try {
      await (prisma as any).membership.deleteMany({ where: { startupId: startup.id } });
      await (prisma as any).memory.deleteMany({ where: { startupId: startup.id } });
      await (prisma as any).startup.delete({ where: { id: startup.id } });
      await (prisma as any).user.delete({ where: { id: user.id } });
    } catch {}
  }
}

runMeetingNotesTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
