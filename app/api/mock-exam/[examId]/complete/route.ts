/**
 * POST /api/mock-exam/[examId]/complete
 * 模試の完了処理:
 *   1. 全回答を採点(各問題のanswer.value と比較)
 *   2. 全体スコア・教科別スコア計算
 *   3. mock_attempts.completed_at をセット
 *   4. attempts テーブルに source='mock_initial' で全50問の挑戦記録を INSERT
 *      → 既存のAI出題エンジン(弱点重み)が即時反映される
 * リクエスト: { answers: Record<string, number> }
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CompleteRequest = z.object({
  answers: z.record(z.string(), z.number().int().min(1).max(4)),
});

type QuestionRow = {
  id: string;
  section: string;
  answer: { value: number } | number;
  order_index: number;
};

export async function POST(req: Request, ctx: { params: Promise<{ examId: string }> }) {
  try {
    const user = await requireUser();
    const { examId } = await ctx.params;
    const parsed = CompleteRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    const { answers } = parsed.data;

    // 模試の全問題と正解
    const qResult = await db.execute(sql`
      select q.id, q.section, q.answer, meq.order_index
      from mock_exam_questions meq
      join questions q on q.id = meq.question_id
      where meq.mock_exam_id = ${examId}
      order by meq.order_index
    `);
    const qRows = ((qResult as { rows?: QuestionRow[] }).rows
      ?? (qResult as unknown as QuestionRow[])) as QuestionRow[];
    if (!qRows || qRows.length === 0) {
      return NextResponse.json({ error: { code: 'no_questions', message: '模試の問題がありません' } }, { status: 404 });
    }

    // 採点
    let totalCorrect = 0;
    const sectionScores: Record<string, { total: number; correct: number }> = {};

    for (const q of qRows) {
      const idx = String(q.order_index);
      const userAns = answers[idx];
      const correctValue = typeof q.answer === 'object' && q.answer !== null
        ? (q.answer as { value: number }).value
        : Number(q.answer);
      const isCorrect = userAns === correctValue;
      if (isCorrect) totalCorrect++;

      // section別集計
      sectionScores[q.section] ??= { total: 0, correct: 0 };
      sectionScores[q.section].total++;
      if (isCorrect) sectionScores[q.section].correct++;

      // attempts テーブルに記録(AI出題エンジン反映)
      // source は 'mock_' + examId のスラッグ化(例: mock_initial-50 / mock_pre-exam-2026-07)
      if (userAns !== undefined) {
        const sourceLabel = `mock_${examId}`;
        await db.execute(sql`
          insert into attempts (user_id, question_id, user_answer, is_correct, response_seconds, source, attempted_at)
          values (
            ${user.id}::uuid,
            ${q.id}::uuid,
            ${JSON.stringify({ value: userAns })}::jsonb,
            ${isCorrect},
            0,
            ${sourceLabel},
            now()
          )
        `);
      }
    }

    // 完了マーク
    await db.execute(sql`
      update mock_attempts
      set completed_at = now(),
          answers = ${JSON.stringify(answers)}::jsonb,
          score = ${totalCorrect},
          section_scores = ${JSON.stringify(sectionScores)}::jsonb,
          current_question_index = ${qRows.length}
      where user_id = ${user.id}::uuid and mock_exam_id = ${examId}
    `);

    return NextResponse.json({
      score: totalCorrect,
      total: qRows.length,
      sectionScores,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
