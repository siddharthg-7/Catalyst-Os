/**
 * P1 Task 8 — invitation & onboarding delivery boundary.
 *
 * Configured with Gmail SMTP transport using credentials from .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Dispatches responsive, branded HTML emails alongside plain-text fallbacks
 * whenever a founder invites or adds a team member.
 */

export interface InvitationEmail {
  to: string;
  companyName: string;
  role: string;
  invitedByName: string;
  invitationUrl: string;
  expiresAt: Date;
}

export interface TeamWelcomeEmail {
  to: string;
  companyName: string;
  fullName: string;
  role: string;
  department: string;
  addedByName: string;
  workspaceUrl: string;
}

export type DeliveryChannel = 'smtp' | 'console';

export interface DeliveryResult {
  delivered: boolean;
  channel: DeliveryChannel;
  error?: string;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function renderSubject(email: InvitationEmail): string {
  return `You've been invited to ${email.companyName} on CatalystOS`;
}

function renderText(email: InvitationEmail): string {
  return [
    `Welcome to ${email.companyName} on CatalystOS!`,
    '',
    `${email.invitedByName} has invited you to join the venture workspace as ${email.role}.`,
    '',
    `Accept your invitation: ${email.invitationUrl}`,
    '',
    `This single-use link expires on ${email.expiresAt.toUTCString()}.`,
    'If you were not expecting this invitation, you may safely disregard this email.',
    '',
    '— The CatalystOS Autonomous Venture Operating System'
  ].join('\n');
}

function renderHtml(email: InvitationEmail): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to ${email.companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f17; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(180deg, #1e293b 0%, #111827 100%); border-bottom: 1px solid #1f2937;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8;">CatalystOS · Venture Hub</span>
                    <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Team Workspace Invitation</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
                <strong style="color: #ffffff;">${email.invitedByName}</strong> has added you to join <strong style="color: #ffffff;">${email.companyName}</strong> on CatalystOS.
              </p>

              <!-- Role Card -->
              <table role="presentation" width="100%" style="margin: 20px 0; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600;">Assigned Role</span>
                    <div style="font-size: 16px; font-weight: 700; color: #38bdf8; margin-top: 4px;">${email.role}</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                Click below to accept your invitation, configure your member credentials, and access the autonomous venture operating workspace:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%">
                <tr>
                  <td align="center">
                    <a href="${email.invitationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Accept Invitation & Open Workspace →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; line-height: 18px; color: #64748b;">
                <p style="margin: 0 0 8px 0;">
                  🔒 <strong>Single-Use Security Token:</strong> This invitation link is cryptographically tied to <code>${email.to}</code> and expires on <strong>${email.expiresAt.toUTCString()}</strong>.
                </p>
                <p style="margin: 0; word-break: break-all;">
                  Button not working? Copy and paste this URL into your browser:<br>
                  <a href="${email.invitationUrl}" style="color: #38bdf8; text-decoration: underline;">${email.invitationUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
              CatalystOS Autonomous Venture Studio · Powered by AI Multi-Agent Council
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Attempts invitation delivery via Gmail SMTP.
 * Never throws: a mail failure must not break database persistence.
 */
export async function sendInvitationEmail(email: InvitationEmail): Promise<DeliveryResult> {
  if (!smtpConfigured()) {
    console.log(
      `\n[invitationMailer] No SMTP configured — invitation logged to console.\n` +
      `  To:      ${email.to}\n` +
      `  Company: ${email.companyName}\n` +
      `  Role:    ${email.role}\n` +
      `  Expires: ${email.expiresAt.toISOString()}\n` +
      `  URL:     ${email.invitationUrl}\n`
    );
    return { delivered: false, channel: 'console' };
  }

  try {
    const moduleName = 'nodemailer';
    const nodemailer: any = await import(/* @vite-ignore */ moduleName).catch(() => null);
    if (!nodemailer) {
      console.warn('[invitationMailer] SMTP is configured but nodemailer is not available.');
      return { delivered: false, channel: 'console', error: 'nodemailer not installed' };
    }

    const transport = (nodemailer.default || nodemailer).createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });

    const fromAddress = process.env.SMTP_FROM
      ? `CatalystOS <${process.env.SMTP_FROM}>`
      : `CatalystOS <${process.env.SMTP_USER}>`;

    const info = await transport.sendMail({
      from: fromAddress,
      to: email.to,
      subject: renderSubject(email),
      text: renderText(email),
      html: renderHtml(email)
    });

    console.log(`[invitationMailer] ✅ Email successfully dispatched via Gmail SMTP to ${email.to} (MessageId: ${info?.messageId})`);
    return { delivered: true, channel: 'smtp' };
  } catch (err: any) {
    console.error('[invitationMailer] ❌ Gmail SMTP delivery failed:', err.message);
    return { delivered: false, channel: 'smtp', error: err.message };
  }
}

/**
 * Sends a welcome notice email when a team member is added directly to the company roster.
 */
export async function sendTeamWelcomeEmail(welcome: TeamWelcomeEmail): Promise<DeliveryResult> {
  if (!smtpConfigured()) {
    console.log(`[invitationMailer] Team member ${welcome.fullName} (${welcome.to}) added to ${welcome.companyName}.`);
    return { delivered: false, channel: 'console' };
  }

  try {
    const moduleName = 'nodemailer';
    const nodemailer: any = await import(/* @vite-ignore */ moduleName).catch(() => null);
    if (!nodemailer) {
      return { delivered: false, channel: 'console', error: 'nodemailer not installed' };
    }

    const transport = (nodemailer.default || nodemailer).createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });

    const fromAddress = process.env.SMTP_FROM
      ? `CatalystOS <${process.env.SMTP_FROM}>`
      : `CatalystOS <${process.env.SMTP_USER}>`;

    const subject = `Welcome to the ${welcome.companyName} Team on CatalystOS`;
    const text = [
      `Hello ${welcome.fullName},`,
      '',
      `You have been added to the venture team for ${welcome.companyName} on CatalystOS.`,
      `Role: ${welcome.role}`,
      `Department: ${welcome.department}`,
      `Added by: ${welcome.addedByName}`,
      '',
      `Log in or view your workspace at: ${welcome.workspaceUrl}`,
      '',
      '— CatalystOS Autonomous Venture System'
    ].join('\n');

    const html = `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; background-color: #0b0f17; font-family: sans-serif; color: #f1f5f9;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1e293b; border-radius: 14px; padding: 32px;">
    <h2 style="color: #ffffff; margin-top: 0;">Welcome to ${welcome.companyName}!</h2>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 22px;">
      <strong>${welcome.addedByName}</strong> has added you to the venture team on CatalystOS.
    </p>
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Role:</strong> <span style="color: #38bdf8;">${welcome.role}</span></p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Department:</strong> ${welcome.department}</p>
    </div>
    <a href="${welcome.workspaceUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px;">
      Open CatalystOS Workspace →
    </a>
  </div>
</body>
</html>`;

    await transport.sendMail({
      from: fromAddress,
      to: welcome.to,
      subject,
      text,
      html
    });

    console.log(`[invitationMailer] ✅ Team welcome email delivered via Gmail SMTP to ${welcome.to}`);
    return { delivered: true, channel: 'smtp' };
  } catch (err: any) {
    console.error('[invitationMailer] ❌ Team welcome email error:', err.message);
    return { delivered: false, channel: 'smtp', error: err.message };
  }
}
