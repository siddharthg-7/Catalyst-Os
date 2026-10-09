/**
 * CatalystOS - Backend EmailJS Dispatcher
 * Allows the Node.js backend to dispatch emails via EmailJS REST API
 * using Service ID: service_6dwbxni, Template ID: template_xqoitun, Public Key: Ps80tBKWq2vwHICGm.
 */

export const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_6dwbxni';
export const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_xqoitun';
export const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'Ps80tBKWq2vwHICGm';

export interface BackendEmailJsPayload {
  to: string;
  name?: string;
  fromName?: string;
  companyName?: string;
  role?: string;
  department?: string;
  inviteLink?: string;
  subject?: string;
  message?: string;
}

export async function sendBackendEmailJs(payload: BackendEmailJsPayload): Promise<{ success: boolean; status?: number; error?: string }> {
  const to = (payload.to || '').trim();
  const name = (payload.name || to.split('@')[0] || 'Team Member').trim();
  const fromName = (payload.fromName || 'The Founder').trim();
  const companyName = (payload.companyName || 'CatalystOS Venture').trim();
  const role = (payload.role || 'Team Member').trim();
  const department = (payload.department || 'Operations').trim();
  const inviteLink = payload.inviteLink || `${process.env.APP_URL || 'http://localhost:3000'}/accept-invitation`;
  const subject = payload.subject || `Invitation to join ${companyName} on CatalystOS`;
  const message = payload.message || `${fromName} has added you to ${companyName} as ${role} in ${department}. Open your workspace: ${inviteLink}`;

  const template_params = {
    to_email: to,
    email: to,
    recipient_email: to,
    to_name: name,
    name: name,
    recipient_name: name,
    fullName: name,
    from_name: fromName,
    company_name: companyName,
    company: companyName,
    role,
    department,
    domain: department,
    invite_link: inviteLink,
    invitation_url: inviteLink,
    link: inviteLink,
    subject,
    message,
    body: message
  };

  try {
    const origin = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params
      })
    });

    if (res.ok) {
      console.log(`[EmailJS-Backend] ✅ Email successfully dispatched to ${to} (HTTP 200 OK)`);
      return { success: true, status: 200 };
    } else {
      const errText = await res.text();
      console.warn(`[EmailJS-Backend] ⚠️ EmailJS returned HTTP ${res.status}:`, errText);
      return { success: false, status: res.status, error: errText };
    }
  } catch (err: any) {
    console.error(`[EmailJS-Backend] ❌ Failed to dispatch EmailJS to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}
