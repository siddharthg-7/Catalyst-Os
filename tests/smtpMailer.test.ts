/**
 * CatalystOS - Test Suite: SMTP Mailer & Founder Email Delivery
 * Tests Gmail SMTP connectivity, invitation dispatch, welcome notices,
 * and direct email dispatch from founder to recipient email addresses.
 */

import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert';
import {
  verifySmtpConnection,
  sendDirectEmail,
  sendInvitationEmail,
  sendTeamWelcomeEmail
} from '../backend/services/invitationMailer';

test('SMTP Mailer [Test 1]: Live Gmail SMTP Connection Verification', async () => {
  const result = await verifySmtpConnection();
  assert.ok(result.ok, `SMTP verification should succeed: ${result.message}`);
  assert.ok(result.message.includes('Verified connection'), 'Should confirm verification');
  console.log('✅ PASS: Test 1 - Live Gmail SMTP server connection verified successfully.');
});

test('SMTP Mailer [Test 2]: Direct Email Dispatch from Founder to Recipient', async () => {
  const recipient = process.env.SMTP_USER || 'siddharthexam21@gmail.com';
  const delivery = await sendDirectEmail({
    to: recipient,
    subject: 'CatalystOS Automated Test — Founder Email Dispatch',
    text: 'This email validates that the founder can dispatch direct messages to the recipient via Gmail SMTP.',
    senderName: 'Founder Test Suite',
    replyTo: recipient
  });

  assert.strictEqual(delivery.delivered, true, 'Email should be marked delivered');
  assert.strictEqual(delivery.channel, 'smtp', 'Delivery channel must be smtp');
  assert.ok(delivery.messageId, 'Delivery should return a messageId');
  console.log(`✅ PASS: Test 2 - Direct email sent via Gmail SMTP. MessageId: ${delivery.messageId}`);
});

test('SMTP Mailer [Test 3]: Invitation Email With Custom Founder Reply-To', async () => {
  const recipient = process.env.SMTP_USER || 'siddharthexam21@gmail.com';
  const delivery = await sendInvitationEmail({
    to: recipient,
    companyName: 'Nexus Ventures',
    role: 'FINANCE',
    invitedByName: 'Siddharth (Founder)',
    inviterEmail: recipient,
    invitationUrl: 'http://localhost:3000/accept-invitation?token=test_token_123',
    expiresAt: new Date(Date.now() + 86400000)
  });

  assert.strictEqual(delivery.delivered, true, 'Invitation email should be delivered');
  assert.strictEqual(delivery.channel, 'smtp', 'Invitation channel should be smtp');
  console.log('✅ PASS: Test 3 - Invitation email dispatched with founder sender and reply-to headers.');
});

test('SMTP Mailer [Test 4]: Team Welcome Email Dispatch', async () => {
  const recipient = process.env.SMTP_USER || 'siddharthexam21@gmail.com';
  const delivery = await sendTeamWelcomeEmail({
    to: recipient,
    companyName: 'Nexus Ventures',
    fullName: 'Alex Morgan',
    role: 'HEAD_OF_GROWTH',
    department: 'GROWTH',
    addedByName: 'Siddharth (Founder)',
    addedByEmail: recipient,
    workspaceUrl: 'http://localhost:3000/dashboard'
  });

  assert.strictEqual(delivery.delivered, true, 'Team welcome email should be delivered');
  assert.strictEqual(delivery.channel, 'smtp', 'Welcome email channel should be smtp');
  console.log('✅ PASS: Test 4 - Team welcome email dispatched via Gmail SMTP.');
});
