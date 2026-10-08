/**
 * P1 Task 8 — invitation delivery boundary.
 *
 * CatalystOS has no email provider today. Rather than build one in this task,
 * this module is the single seam where delivery happens: it uses nodemailer when
 * the package is installed AND SMTP is configured, and otherwise logs the
 * invitation URL to the server console so development flows still work.
 *
 * To enable real delivery later:
 *   npm i nodemailer
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * No caller changes are required.
 */

export interface InvitationEmail {
  to: string;
  companyName: string;
  role: string;
  invitedByName: string;
  invitationUrl: string;
  expiresAt: Date;
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
    `${email.invitedByName} invited you to join ${email.companyName} on CatalystOS as ${email.role}.`,
    '',
    `Accept your invitation: ${email.invitationUrl}`,
    '',
    `This link is single-use and expires ${email.expiresAt.toUTCString()}.`,
    'If you were not expecting this invitation you can ignore this message.'
  ].join('\n');
}

/**
 * Attempts delivery. Never throws: a mail failure must not roll back an
 * invitation that was already persisted, so the caller decides how to surface it.
 */
export async function sendInvitationEmail(email: InvitationEmail): Promise<DeliveryResult> {
  if (!smtpConfigured()) {
    // Development fallback. The raw URL is console-only and is never returned
    // by the API in production (see invitationService.createInvitation).
    console.log(
      `\n[invitationMailer] No SMTP configured — invitation not emailed.\n` +
      `  To:      ${email.to}\n` +
      `  Company: ${email.companyName}\n` +
      `  Role:    ${email.role}\n` +
      `  Expires: ${email.expiresAt.toISOString()}\n` +
      `  URL:     ${email.invitationUrl}\n`
    );
    return { delivered: false, channel: 'console' };
  }

  try {
    // Optional dependency: imported dynamically so the app runs without it.
    // Indirect specifier keeps TypeScript from requiring the optional package's types.
    const moduleName = 'nodemailer';
    const nodemailer: any = await import(/* @vite-ignore */ moduleName).catch(() => null);
    if (!nodemailer) {
      console.warn('[invitationMailer] SMTP is configured but nodemailer is not installed (npm i nodemailer).');
      return { delivered: false, channel: 'console', error: 'nodemailer not installed' };
    }

    const transport = (nodemailer.default || nodemailer).createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email.to,
      subject: renderSubject(email),
      text: renderText(email)
    });

    return { delivered: true, channel: 'smtp' };
  } catch (err: any) {
    console.error('[invitationMailer] Delivery failed:', err.message);
    return { delivered: false, channel: 'smtp', error: err.message };
  }
}
