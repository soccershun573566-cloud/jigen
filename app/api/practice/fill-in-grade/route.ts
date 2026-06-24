/**
 * POST /api/practice/fill-in-grade
 *
 * 穴埋め問題の採点。
 *   - リクエスト: { questionId, answers: [{idx, value}] }
 *   - DB の questionSummaries.fillInAnswers (正解配列) と照合
 *   - 各空欄について 完全一致 / aliases / 全角半角・カタカナ正規化 で採点
 *   - レスポンス: { results: [{idx, correct, expected, given}], score: {correct, total} }
 */
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { questionSummaries } from '@/db/schema';

export const dynamic = 'force-dynamic';

const Body = z.object({
  questionId: z.string().uuid(),
  answers: z.array(z.object({
    idx: z.number().int().min(1),
    value: z.string().min(0).max(200),
  })).min(1).max(10),
});

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[　]/g, '') // 全角スペース
    .replace(/[、,]/g, '')   // 区切り
    .normalize('NFKC');       // 全角→半角 等
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    const { questionId, answers } = parsed.data;

    const [summary] = await db
      .select()
      .from(questionSummaries)
      .where(eq(questionSummaries.questionId, questionId))
      .limit(1);
    if (!summary) {
      return NextResponse.json({ error: { code: 'no_summary', message: '穴埋め問題が見つかりません' } }, { status: 404 });
    }

    const expectedList = summary.fillInAnswers as Array<{ idx: number; answer: string; aliases: string[] }>;
    const expectedByIdx = new Map<number, { answer: string; aliases: string[] }>();
    for (const e of expectedList) {
      expectedByIdx.set(e.idx, { answer: e.answer, aliases: e.aliases });
    }

    const results = answers.map(({ idx, value }) => {
      const ex = expectedByIdx.get(idx);
      if (!ex) return { idx, correct: false, expected: '', given: value };
      const normGiven = normalize(value);
      const candidates = [ex.answer, ...ex.aliases].map(normalize);
      const correct = candidates.length > 0 && candidates.includes(normGiven);
      return { idx, correct, expected: ex.answer, given: value };
    });

    const correctCount = results.filter((r) => r.correct).length;

    return NextResponse.json({
      results,
      score: { correct: correctCount, total: results.length },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
