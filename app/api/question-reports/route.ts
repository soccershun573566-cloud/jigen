/**
 * POST /api/question-reports — 問題への通報
 *
 * フロー:
 *   1) 認証(requireUser)
 *   2) zod 検証
 *   3) question_reports INSERT
 *   4) support@jigen-app.com に通知メール(失敗してもDB保存は完了)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/notifications/email';

export const dynamic = 'force-dynamic';

const ReportRequest = z.object({
  questionId: z.string().uuid(),
  category: z.enum(['wrong_answer', 'unclear_text', 'bad_choice', 'bad_explanation', 'other']),
  comment: z.string().max(2000).optional().nullable(),
});

const CATEGORY_LABEL: Record<string, string> = {
  wrong_answer: '答えが違う/間違っている',
  unclear_text: '問題文がおかしい/わかりづらい',
  bad_choice: '選択肢がおかしい',
  bad_explanation: '解説がおかしい',
  other: 'その他',
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = ReportRequest.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { questionId, category, comment } = parsed.data;

    // 問題情報を引いて通知メールに含める(問題の同定用)
    const qR = await db.execute(sql`
      select section, sub_topic, body_md, answer
      from questions where id = ${questionId}::uuid limit 1
    `).catch(() => null);
    const qRows = qR
      ? ((qR as unknown as { rows?: Array<{ section: string; sub_topic: string; body_md: string; answer: unknown }> }).rows
          ?? (qR as unknown as Array<{ section: string; sub_topic: string; body_md: string; answer: unknown }>))
      : [];
    const q = qRows?.[0];

    // 通報を INSERT(冪等用に同じユーザー×同じ問題×同じカテゴリの直近1分以内は無視してもいいが、 まずは素通し)
    await db.execute(sql`
      insert into question_reports (user_id, question_id, category, comment)
      values (${user.id}::uuid, ${questionId}::uuid, ${category}, ${comment ?? null})
    `);

    // support@ に通知メール(失敗しても 200 を返す: DB は保存できた)
    const supportTo = process.env.SUPPORT_EMAIL ?? 'support@jigen-app.com';
    const subj = `[ジゲン通報] ${CATEGORY_LABEL[category] ?? category} / ${q?.section ?? '不明'}`;
    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 640px;">
        <h2 style="color: #B8860B;">🦖 問題への通報</h2>
        <table cellpadding="6" style="border-collapse: collapse; font-size: 14px;">
          <tr><td><b>カテゴリ</b></td><td>${CATEGORY_LABEL[category] ?? category}</td></tr>
          <tr><td><b>通報者ID</b></td><td>${user.id}</td></tr>
          <tr><td><b>通報者メール</b></td><td>${user.email ?? '-'}</td></tr>
          <tr><td><b>問題ID</b></td><td>${questionId}</td></tr>
          <tr><td><b>教科</b></td><td>${q?.section ?? '-'} / ${q?.sub_topic ?? '-'}</td></tr>
        </table>
        <h3 style="margin-top: 20px;">問題本文</h3>
        <pre style="background: #f6f6f6; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${(q?.body_md ?? '').slice(0, 1000)}</pre>
        <h3>正解(DB)</h3>
        <pre style="background: #f6f6f6; padding: 12px; border-radius: 6px;">${JSON.stringify(q?.answer ?? null)}</pre>
        <h3>コメント</h3>
        <pre style="background: #fffbea; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${comment ?? '(コメントなし)'}</pre>
        <p style="font-size: 11px; color: #888; margin-top: 20px;">
          受信日時: ${new Date().toISOString()}
        </p>
      </div>
    `;
    try {
      await sendEmail({ to: supportTo, subject: subj, html });
    } catch {
      /* メール失敗してもDB保存は成功扱い */
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
