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
import { attempts } from '@/db/schema';

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

    // 【冪等性ガード】 既に完了済みなら attempts 重複INSERT を防ぐため、 既存スコアを返して早期 return
    // (ボタン連打・ネットワークリトライ・タブリロード時の二重送信対策)
    const existing = await db.execute(sql`
      select completed_at, score, section_scores
      from mock_attempts
      where user_id = ${user.id}::uuid and mock_exam_id = ${examId}
      limit 1
    `);
    const existingRows = ((existing as { rows?: Array<{ completed_at: string | null; score: number | null; section_scores: unknown }> }).rows
      ?? (existing as unknown as Array<{ completed_at: string | null; score: number | null; section_scores: unknown }>));
    const prior = existingRows?.[0];
    if (prior?.completed_at) {
      // 既存の集計結果を返却(attempts 重複INSERT は行わない)
      const qCountResult = await db.execute(sql`
        select count(*)::int as c from mock_exam_questions where mock_exam_id = ${examId}
      `);
      const qCountRows = ((qCountResult as { rows?: { c: number }[] }).rows ?? (qCountResult as unknown as { c: number }[]));
      const totalQuestions = qCountRows?.[0]?.c ?? 50;
      return NextResponse.json({
        score: prior.score ?? 0,
        total: totalQuestions,
        sectionScores: (prior.section_scores ?? {}) as Record<string, { total: number; correct: number }>,
        alreadyCompleted: true,
      });
    }

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

    // 採点 + attempts 用レコード収集(DB往復はループ外で1回だけ)
    let totalCorrect = 0;
    const sectionScores: Record<string, { total: number; correct: number }> = {};
    const sourceLabel = `mock_${examId}`;
    const attemptRows: Array<{
      userId: string;
      questionId: string;
      userAnswer: { value: number };
      isCorrect: boolean;
      responseSeconds: number;
      source: string;
    }> = [];

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

      // attempts 用レコードを配列に蓄積(あとで一括INSERT)
      if (userAns !== undefined) {
        attemptRows.push({
          userId: user.id,
          questionId: q.id,
          userAnswer: { value: userAns },
          isCorrect,
          responseSeconds: 0,
          source: sourceLabel,
        });
      }
    }

    // 【大幅高速化】 旧: 50問 × 逐次 INSERT(RTT 50回)+ mock_attempts UPDATE(RTT 1回) = RTT 51回
    //              新: 1本の bulk INSERT + UPDATE を Promise.all で並列実行(RTT 1回)
    //              ※ drizzle の values([...]) で 1ステートメントに展開される
    await Promise.all([
      attemptRows.length > 0
        ? db.insert(attempts).values(attemptRows)
        : Promise.resolve(),
      db.execute(sql`
        update mock_attempts
        set completed_at = now(),
            answers = ${JSON.stringify(answers)}::jsonb,
            score = ${totalCorrect},
            section_scores = ${JSON.stringify(sectionScores)}::jsonb,
            current_question_index = ${qRows.length}
        where user_id = ${user.id}::uuid and mock_exam_id = ${examId}
      `),
    ]);

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
