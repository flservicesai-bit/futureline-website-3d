import { Resend } from 'resend';

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  sendEmail(notification: EmailNotification): Promise<boolean>;
}

class ConsoleNotificationProvider implements NotificationProvider {
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    console.log('[Notification] Email would be sent:');
    console.log(`  To: ${notification.to}`);
    console.log(`  Subject: ${notification.subject}`);
    console.log(`  Body: ${notification.body}`);
    if (notification.metadata) {
      console.log(`  Metadata: ${JSON.stringify(notification.metadata)}`);
    }
    return true;
  }
}

class ResendNotificationProvider implements NotificationProvider {
  private resend: Resend;
  private fromAddress: string;

  constructor(apiKey: string, fromAddress: string = process.env.RESEND_FROM_EMAIL || 'FutureLine <onboarding@resend.dev>') {
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      // futureline.ai has no inbound MX, so a reply to the From address would
      // bounce. Point replies at a mailbox that actually receives — the brand
      // contact address — so "just reply to this email" is true.
      const replyTo = process.env.REPLY_TO_EMAIL || 'flservices.ai@gmail.com';

      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: notification.to,
        replyTo,
        subject: notification.subject,
        text: notification.body,
      });

      if (error) {
        console.error('[Resend] Error sending email:', error);
        return false;
      }

      console.log(`[Resend] Email sent successfully to ${notification.to}, id: ${data?.id}`);
      return true;
    } catch (err) {
      console.error('[Resend] Exception sending email:', err);
      return false;
    }
  }
}

const resendApiKey = process.env.Resend_api_key_2 || process.env.RESEND_API_KEY;
let provider: NotificationProvider = resendApiKey
  ? new ResendNotificationProvider(resendApiKey)
  : new ConsoleNotificationProvider();

export function setNotificationProvider(p: NotificationProvider) {
  provider = p;
}

export function getNotificationProvider(): NotificationProvider {
  return provider;
}

export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  try {
    return await provider.sendEmail(notification);
  } catch (error) {
    console.error('[Notification] Failed to send email:', error);
    return false;
  }
}

export async function notifyWelcome(user: { name: string; email: string }) {
  const appUrl = process.env.APP_URL || 'https://futureline.ai';
  await sendEmail({
    to: user.email,
    subject: 'Welcome to FutureLine!',
    body: `Dear ${user.name},\n\nWelcome to FutureLine! Your account has been created successfully.\n\nYou can now sign in and explore our professional courses, digital services, and AI solutions.\n\nSign in at any time to get started:\n${appUrl}/login\n\nIf you have any questions, feel free to reach out to our team.\n\nBest regards,\nFutureLine Team`,
    metadata: { type: 'welcome' },
  });
}

export async function notifyPasswordChanged(user: { name: string; email: string }) {
  const appUrl = process.env.APP_URL || 'https://futureline.ai';
  await sendEmail({
    to: user.email,
    subject: 'FutureLine - Your Password Has Been Changed',
    body: `Dear ${user.name},\n\nYour password has been successfully changed.\n\nIf you did not make this change, please contact our support team immediately or reset your password here:\n${appUrl}/forgot-password\n\nBest regards,\nFutureLine Team`,
    metadata: { type: 'password_changed' },
  });
}

export async function notifyNewEnrollment(user: { name: string; email: string }, course: { title: string; slug: string }) {
  await sendEmail({
    to: user.email,
    subject: `Welcome to ${course.title}!`,
    body: `Dear ${user.name},\n\nYou have been successfully enrolled in "${course.title}".\n\nYou can access your course at any time from your dashboard.\n\nHappy learning!\n\nBest regards,\nFutureLine Team`,
    metadata: { type: 'new_enrollment', courseSlug: course.slug },
  });
}

export async function notifyPaymentPending(user: { name: string; email: string }, course: { title: string }) {
  await sendEmail({
    to: user.email,
    subject: `FutureLine - Payment Received for "${course.title}"`,
    body: `Dear ${user.name},\n\nThank you — we have received your payment request for "${course.title}".\n\nYour enrolment is currently pending manual verification. Please ensure you have sent your payment receipt via WhatsApp to 96532326 with your full name.\n\nYour enrolment will be approved within 12 hours of receipt confirmation.\n\nIf you have any questions, please contact us on WhatsApp at 96532326.\n\nBest regards,\nFutureLine Team`,
    metadata: { type: 'payment_pending', courseTitle: course.title },
  });
}

export async function notifyOrderRejected(user: { name: string; email: string }, course: { title: string }) {
  await sendEmail({
    to: user.email,
    subject: `FutureLine - Payment Verification Failed for "${course.title}"`,
    body: `Dear ${user.name},\n\nUnfortunately, we were unable to verify your payment for "${course.title}".\n\nThis may be because:\n- The payment receipt was not received\n- The receipt details did not match your registration\n\nPlease send your payment receipt via WhatsApp to 96532326 with your full name, or contact us directly for assistance.\n\nBest regards,\nFutureLine Team`,
    metadata: { type: 'order_rejected', courseTitle: course.title },
  });
}

/**
 * Auto-reply sent to whoever submits a request — through an enquiry form or by
 * finishing the get-started flow (whether they identified themselves with
 * Google or with email). It quotes back the topic they picked and the request
 * they actually wrote, so the reply is about *their* enquiry rather than a
 * generic "thanks, we got it".
 */
export async function notifyLeadConfirmation(lead: {
  name: string;
  email: string;
  topic?: string;
  message?: string;
  source?: string;
}) {
  const topic = (lead.topic || '').trim();
  const message = (lead.message || '').trim();

  // Human-readable label for the get-started pillar keys.
  const TOPIC_LABELS: Record<string, string> = {
    consulting: 'AI Consulting',
    applications: 'Applications & Custom Software',
    training: 'Training & Enablement',
    readiness: 'AI Readiness Assessment',
  };
  const topicLabel = TOPIC_LABELS[topic.toLowerCase()] || topic;

  const subject = topicLabel
    ? `FutureLine — we received your ${topicLabel} request`
    : 'FutureLine — we received your request';

  const lines = [
    `Dear ${lead.name},`,
    '',
    'Thank you for reaching out to FutureLine. This is an automatic confirmation that your request has reached our team.',
    '',
  ];

  if (topicLabel) lines.push(`What you asked about: ${topicLabel}`);
  if (message) {
    // Keep the quote short — it's a reminder of what they sent, not a transcript.
    const excerpt = message.length > 600 ? `${message.slice(0, 600)}…` : message;
    lines.push('', 'Your request, as we received it:', `"${excerpt}"`);
  }

  lines.push(
    '',
    'A member of our team will review this and get back to you personally within one business day. If anything has changed in the meantime, just reply to this email and it will reach us.',
    '',
    'Best regards,',
    'FutureLine Team',
    'https://futureline.ai',
  );

  await sendEmail({
    to: lead.email,
    subject,
    body: lines.join('\n'),
    metadata: { type: 'lead_confirmation', topic: topic || undefined, source: lead.source },
  });
}

export async function notifyAdminNewLead(lead: { name: string; email: string; phone?: string; tourType: string; message: string; source: string }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'flservices.ai@gmail.com';
  await sendEmail({
    to: adminEmail,
    subject: `New Lead Submission: ${lead.name}`,
    body: `A new lead has been submitted.\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone || 'Not provided'}\nEnquiry Type: ${lead.tourType}\nSource: ${lead.source}\n\nMessage:\n${lead.message}\n\nPlease review this lead in the admin panel.`,
    metadata: { type: 'admin_new_lead', leadEmail: lead.email },
  });
}

export async function notifyAutomationTemplate(to: string, subject: string, body: string, metadata?: Record<string, any>) {
  await sendEmail({
    to,
    subject,
    body,
    metadata: { type: 'automation_template', ...metadata },
  });
}
