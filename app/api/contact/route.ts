/**
 * POST /api/contact — お問い合わせフォーム受信
 *
 * 認証不要(LP/contact からも送信可能)。
 * support@ に通知メール(replyTo にユーザーメアド)。
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/notifications/email';

export const dynamic = 'force-dynamic';

const ContactRequest = z.object({
  name: z.string().max(80).optional().nullable(),
  email: z.string().email().max(200),
  category: z.enum(['question', 'bug', 'request', 'billing', 'other']),
  message: z.string().min(1).max(5000),
  // 認証ユーザーから送信されればここにメアド付与
  userId: z.string().optional().nullable(),
});

const CATEGORY_LABEL: Record<string, string> = {
  question: 'ご質問',
  bug: '不具合の報告',
  request: '機能のご要望',
  billing: '課金・解約について',
  other: 'その他',
};

// シンプルなレート制限(IPあたり 1分5件まで)
const ipBuckets = new Map<string, number[]>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 5;
  const arr = (ipBuckets.get(ip) ?? []).filter(t => now - t < window);
  if (arr.length >= limit) return false;
  arr.push(now);
  ipBuckets.set(ip, arr);
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRate(ip)) {
      return NextResponse.json(
        { error: { code: 'rate_limit', message: '送信が連続しています。 しばらく時間をおいてからお試しください' } },
        { status: 429 },
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = ContactRequest.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { name, email, category, message, userId } = parsed.data;

    const supportTo = process.env.SUPPORT_EMAIL ?? 'support@jigen-app.com';
    const subj = `[ジゲン問い合わせ] ${CATEGORY_LABEL[category] ?? category} (${name ?? email})`;
    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 640px;">
        <h2 style="color: #B8860B;">🦖 お問い合わせを受信しました</h2>
        <table cellpadding="6" style="border-collapse: collapse; font-size: 14px;">
          <tr><td><b>カテゴリ</b></td><td>${CATEGORY_LABEL[category] ?? category}</td></tr>
          <tr><td><b>お名前</b></td><td>${name ?? '(未記入)'}</td></tr>
          <tr><td><b>メールアドレス</b></td><td>${email}</td></tr>
          ${userId ? `<tr><td><b>ユーザーID</b></td><td>${userId}</td></tr>` : ''}
          <tr><td><b>受信日時</b></td><td>${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td></tr>
          <tr><td><b>IP</b></td><td>${ip}</td></tr>
        </table>
        <h3 style="margin-top: 20px;">お問い合わせ内容</h3>
        <pre style="background: #f6f6f6; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${message}</pre>
        <p style="font-size: 11px; color: #888; margin-top: 20px;">
          このメールに直接返信すると、 上記のメールアドレスに届きます(replyTo設定済)。
        </p>
      </div>
    `;
    const text = `[ジゲン問い合わせ]\nカテゴリ: ${CATEGORY_LABEL[category]}\n名前: ${name ?? '(未記入)'}\nメール: ${email}\n\n${message}`;

    try {
      await sendEmail({ to: supportTo, subject: subj, html, text, replyTo: email });
    } catch (e) {
      // メール送信失敗はユーザーに伝える(問い合わせは届かないので重要)
      return NextResponse.json(
        { error: { code: 'send_failed', message: 'メール送信に失敗しました。 しばらく後にお試しください' } },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
