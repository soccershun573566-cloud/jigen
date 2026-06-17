/**
 * POST /api/mock-exam/[examId]/complete
 * 模試の完了処理:
 *   1. 全回答を採点(一般=単一値・応用=配列)
 *   2. 全体スコア + 教科別 + 一般/応用別スコア計算
 *   3. mock_attempts.completed_at をセット
 *   4. attempts テーブルに source='mock_<examId>' で全問の挑戦記録を INSERT
 *      → 既存のAI出題エンジン(弱点重み)が即時反映される
 * リクエスト: { answers: Record<string, number | number[]> }
 *   - 一般問題: number(1-4)
 *   - 応用問題: number[](長さ2・各値1-5)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { attempts } from '@/db/schema';
import { isAnswerCorrect } from '@/lib/learning/scoring';

export const dynamic = 'force-dynamic';

const AppliedAnswer = z.array(z.number().int().min(1).max(5)).length(2);
const GeneralAnswer = z.number().int().min(1).max(5);
const CompleteRequest = z.object({
  answers: z.record(z.string(), z.union([GeneralAnswer, AppliedAnswer])),
});

type QuestionRow = {
  id: string;
  section: string;
  answer: unknown;
  is_applied: boolean;
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

    // 冪等性ガード: 既に完了済みなら既存スコアを返却
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
      const qCountResult = await db.execute(sql`
        select count(*)::int as c,
               count(*) filter (where q.is_applied = true)::int as applied_total,
               count(*) filter (where q.is_applied = false)::int as general_total
        from mock_exam_questions meq
        join questions q on q.id = meq.question_id
        where meq.mock_exam_id = ${examId}
      `);
      const qCountRows = ((qCountResult as { rows?: Array<{ c: number; applied_total: number; general_total: number }> }).rows
        ?? (qCountResult as unknown as Array<{ c: number; applied_total: number; general_total: number }>));
      const totalQuestions = qCountRows?.[0]?.c ?? 50;
      const ss = (prior.section_scores ?? {}) as Record<string, { total: number; correct: number }>;
      // section_scores 内に applied/general 集計を含めるため、 もし存在すればそのまま返却
      return NextResponse.json({
        score: prior.score ?? 0,
        total: totalQuestions,
        sectionScores: ss,
        generalScore: (ss as Record<string, { total: number; correct: number }>)['__general']
          ?? { total: qCountRows?.[0]?.general_total ?? 0, correct: 0 },
        appliedScore: (ss as Record<string, { total: number; correct: number }>)['__applied']
          ?? { total: qCountRows?.[0]?.applied_total ?? 0, correct: 0 },
        alreadyCompleted: true,
      });
    }

    // 模試の全問題と正解
    const qResult = await db.execute(sql`
      select q.id, q.section, q.answer, q.is_applied, meq.order_index
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

    let totalCorrect = 0;
    const sectionScores: Record<string, { total: number; correct: number }> = {};
    const generalScore = { total: 0, correct: 0 };
    const appliedScore = { total: 0, correct: 0 };
    const sourceLabel = `mock_${examId}`;
    const attemptRows: Array<{
      userId: string;
      questionId: string;
      userAnswer: { value: number } | { values: number[] };
      isCorrect: boolean;
      responseSeconds: number;
      source: string;
    }> = [];

    for (const q of qRows) {
      const idx = String(q.order_index);
      const userAns = answers[idx];
      const isCorrect = userAns !== undefined && isAnswerCorrect(userAns, q.answer);
      if (isCorrect) totalCorrect++;

      const ss = (sectionScores[q.section] ??= { total: 0, correct: 0 });
      ss.total++;
      if (isCorrect) ss.correct++;

      if (q.is_applied) {
        appliedScore.total++;
        if (isCorrect) appliedScore.correct++;
      } else {
        generalScore.total++;
        if (isCorrect) generalScore.correct++;
      }

      if (userAns !== undefined) {
        attemptRows.push({
          userId: user.id,
          questionId: q.id,
          userAnswer: Array.isArray(userAns) ? { values: userAns } : { value: userAns as number },
          isCorrect,
          responseSeconds: 0,
          source: sourceLabel,
        });
      }
    }

    // section_scores に general/applied 集計を埋め込んで保存(再表示時に使用)
    const sectionScoresWithSummary = {
      ...sectionScores,
      __general: generalScore,
      __applied: appliedScore,
    };

    await Promise.all([
      attemptRows.length > 0
        ? db.insert(attempts).values(attemptRows)
        : Promise.resolve(),
      db.execute(sql`
        update mock_attempts
        set completed_at = now(),
            answers = ${JSON.stringify(answers)}::jsonb,
            score = ${totalCorrect},
            section_scores = ${JSON.stringify(sectionScoresWithSummary)}::jsonb,
            current_question_index = ${qRows.length}
        where user_id = ${user.id}::uuid and mock_exam_id = ${examId}
      `),
    ]);

    return NextResponse.json({
      score: totalCorrect,
      total: qRows.length,
      sectionScores,
      generalScore,
      appliedScore,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
