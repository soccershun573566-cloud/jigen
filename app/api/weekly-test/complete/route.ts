/**
 * POST /api/weekly-test/complete — 金曜小テストの完了処理
 *
 * フロー:
 *   1. 既に完了済みなら冪等チェックで既存スコアを返却
 *   2. 全25問を採点(教科別スコアも集計)
 *   3. weekly_test_attempts.completed_at + score をセット
 *   4. attempts テーブルに source='weekly_test_YYYY-MM-DD' で全問INSERT(bulk)
 *      → 既存のAI出題エンジンに反映
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { attempts } from '@/db/schema';

export const dynamic = 'force-dynamic';

const Req = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.record(z.string(), z.number().int().min(1).max(4)),
});

type QuestionRow = {
  id: string;
  section: string;
  answer: { value: number } | number;
  order_index: number;
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Req.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { weekStart, answers } = parsed.data;

    // 冪等性ガード: 既に完了済みなら既存スコア返却
    const existR = await db.execute(sql`
      select completed_at, score, section_scores, question_ids
      from weekly_test_attempts
      where user_id = ${user.id}::uuid and week_start = ${weekStart}::date
      limit 1
    `);
    const existRows = (existR as unknown as { rows?: Array<{
      completed_at: string | null; score: number | null;
      section_scores: unknown; question_ids: string[];
    }> }).rows ?? (existR as unknown as Array<{
      completed_at: string | null; score: number | null;
      section_scores: unknown; question_ids: string[];
    }>);
    const prior = existRows?.[0];
    if (!prior) {
      return NextResponse.json({ error: { code: 'not_found', message: '金曜小テストの記録が見つかりません' } }, { status: 404 });
    }
    if (prior.completed_at) {
      return NextResponse.json({
        score: prior.score ?? 0,
        total: prior.question_ids?.length ?? 25,
        sectionScores: prior.section_scores ?? {},
        alreadyCompleted: true,
      });
    }

    const ids = prior.question_ids ?? [];
    if (ids.length === 0) {
      return NextResponse.json({ error: { code: 'no_questions', message: '問題リストが空です' } }, { status: 404 });
    }

    // 全問の正解情報を取得(順序は question_ids 順)
    const qR = await db.execute(sql`
      select id::text as id, section, answer
      from questions where id = any(${ids}::uuid[])
    `);
    const qRows = (qR as unknown as { rows?: QuestionRow[] }).rows
      ?? (qR as unknown as QuestionRow[]);
    const qMap = new Map((qRows ?? []).map(q => [q.id, q]));

    // 採点
    let totalCorrect = 0;
    const sectionScores: Record<string, { total: number; correct: number }> = {};
    const sourceLabel = `weekly_test_${weekStart}`;
    const attemptRows: Array<{
      userId: string;
      questionId: string;
      userAnswer: { value: number };
      isCorrect: boolean;
      responseSeconds: number;
      source: string;
    }> = [];

    ids.forEach((qid, i) => {
      const q = qMap.get(qid);
      if (!q) return;
      const idx = String(i + 1);
      const userAns = answers[idx];
      const correctValue = typeof q.answer === 'object' && q.answer !== null
        ? (q.answer as { value: number }).value
        : Number(q.answer);
      const isCorrect = userAns === correctValue;
      if (isCorrect) totalCorrect++;

      sectionScores[q.section] ??= { total: 0, correct: 0 };
      sectionScores[q.section].total++;
      if (isCorrect) sectionScores[q.section].correct++;

      if (userAns !== undefined) {
        attemptRows.push({
          userId: user.id,
          questionId: qid,
          userAnswer: { value: userAns },
          isCorrect,
          responseSeconds: 0,
          source: sourceLabel,
        });
      }
    });

    // 並列実行: attempts bulk INSERT + weekly_test_attempts UPDATE
    await Promise.all([
      attemptRows.length > 0
        ? db.insert(attempts).values(attemptRows)
        : Promise.resolve(),
      db.execute(sql`
        update weekly_test_attempts
        set completed_at = now(),
            answers = ${JSON.stringify(answers)}::jsonb,
            score = ${totalCorrect},
            section_scores = ${JSON.stringify(sectionScores)}::jsonb,
            current_question_index = ${ids.length}
        where user_id = ${user.id}::uuid and week_start = ${weekStart}::date
      `),
    ]);

    return NextResponse.json({
      score: totalCorrect,
      total: ids.length,
      sectionScores,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
