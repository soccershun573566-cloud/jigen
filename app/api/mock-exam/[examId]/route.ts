/**
 * GET /api/mock-exam/[examId]
 * 模試の情報・全問題・現在の受験状況を取得
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ examId: string }> }) {
  try {
    const user = await requireUser();
    const { examId } = await ctx.params;

    // 【大幅高速化】 3クエリ(exam meta / questions / attempt) を Promise.all で並列実行
    // 旧: 3RTT(順番に await) → 新: 1RTT(最遅クエリの時間のみ)
    // exam が存在しないケースでも questions/attempt の取得コストは僅か(空 result)
    const [examResult, questionsResult, attemptResult] = await Promise.all([
      db.execute(sql`
        select id, title, description, questions_count, is_active, one_time,
               available_from, available_until,
               (available_from is null or now() >= available_from) as is_started,
               (available_until is null or now() <= available_until) as is_open
        from mock_exams where id = ${examId} and is_active = true limit 1
      `),
      db.execute(sql`
        select q.id, q.body_md, q.choices, q.section, q.sub_topic, meq.order_index
        from mock_exam_questions meq
        join questions q on q.id = meq.question_id
        where meq.mock_exam_id = ${examId}
        order by meq.order_index
      `),
      db.execute(sql`
        select id, started_at, completed_at, current_question_index, answers, score, section_scores
        from mock_attempts
        where user_id = ${user.id} and mock_exam_id = ${examId}
        limit 1
      `),
    ]);

    const examRows = (examResult as { rows?: unknown[] }).rows ?? (examResult as unknown[]);
    const exam = examRows[0] as {
      id: string; title: string; description: string; questions_count: number; one_time: boolean;
      available_from: string | null; available_until: string | null;
      is_started: boolean; is_open: boolean;
    } | undefined;

    // exam の存在・期間チェック
    if (!exam) {
      return NextResponse.json({ error: { code: 'exam_not_found', message: '模試が見つかりません' } }, { status: 404 });
    }
    if (!exam.is_started) {
      return NextResponse.json({
        error: { code: 'not_yet_open', message: 'この模試はまだ開始されていません', available_from: exam.available_from }
      }, { status: 403 });
    }
    if (!exam.is_open) {
      return NextResponse.json({
        error: { code: 'already_closed', message: 'この模試の受付は終了しました', available_until: exam.available_until }
      }, { status: 403 });
    }

    const questions = (questionsResult as { rows?: unknown[] }).rows ?? (questionsResult as unknown[]);
    const attemptRows = (attemptResult as { rows?: unknown[] }).rows ?? (attemptResult as unknown[]);
    const attempt = attemptRows[0] ?? null;

    return NextResponse.json({
      exam,
      questions,
      attempt, // null なら未開始
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
