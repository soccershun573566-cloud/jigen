import { Resend } from 'resend';

// Resend 経由のメール送信
// 技術構築計画§10.5

let cached: Resend | null = null;
function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  cached = new Resend(key);
  return cached;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@jigen-app.com';
  await getResend().emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
  });
}
