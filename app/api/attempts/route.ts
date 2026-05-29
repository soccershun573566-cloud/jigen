import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { questions, attempts, masteryProfiles } from '@/db/schema';
import { AttemptRequest } from '@/types/api';
import { updateMastery, defaultBktParams } from '@/lib/learning/bkt';
import {
  deriveQuality,
  nextReviewAt,
  nextReviewForNumeric,
} from '@/lib/learning/srs';

// POST /api/attempts — 解答送信
// 1) zod 検証 → 2) Question ロード → 3) 採点 → 4) attempts INSERT
// 5) BKT 更新 + mastery_profiles UPSERT → 6) SRS next_review_at 更新
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = AttemptRequest.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { questionId, userAnswer, dailyTaskId, responseSeconds, confidence } =
      parsed.data;

    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    if (!question) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'question not found' } },
        { status: 404 },
      );
    }

    // 採点
    const { isCorrect, isNearMiss, toleranceRatio } = scoreAttempt(
      question,
      userAnswer,
    );

    // attempts INSERT
    const [inserted] = await db
      .insert(attempts)
      .values({
        userId: user.id,
        questionId: question.id,
        dailyTaskId: dailyTaskId ?? null,
        userAnswer: userAnswer ?? null,
        isCorrect,
        isNearMiss,
        responseSeconds,
        confidence: confidence ?? null,
      })
      .returning();

    // 既存 mastery 取得
    const [prior] = await db
      .select()
      .from(masteryProfiles)
      .where(
        and(
          eq(masteryProfiles.userId, user.id),
          eq(masteryProfiles.subTopic, question.subTopic),
        ),
      )
      .limit(1);

    const priorP = prior?.masteryP ?? defaultBktParams.pL0;
    const newP = updateMastery(priorP, isCorrect, defaultBktParams);

    // SRS quality 算出 + next_review_at 計算
    const quality = deriveQuality({
      isCorrect,
      isNearMiss,
      isNumeric: question.isNumeric,
      responseSeconds,
    });
    const now = new Date();
    const prevIntervalDays = prior?.nextReviewAt
      ? Math.max(
          0,
          Math.round(
            (prior.nextReviewAt.getTime() -
              (prior.lastPracticedAt?.getTime() ?? now.getTime())) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : 0;

    const reviewAt = question.isNumeric
      ? nextReviewForNumeric(
          now,
          isCorrect ? 'correct' : isNearMiss ? 'near_miss' : 'miss',
          prevIntervalDays,
          toleranceRatio,
        )
      : nextReviewAt(now, prevIntervalDays, quality);

    // mastery UPSERT
    await db
      .insert(masteryProfiles)
      .values({
        userId: user.id,
        subTopic: question.subTopic,
        masteryP: newP,
        lastPracticedAt: now,
        nextReviewAt: reviewAt,
        attemptsCount: 1,
        correctCount: isCorrect ? 1 : 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [masteryProfiles.userId, masteryProfiles.subTopic],
        set: {
          masteryP: newP,
          lastPracticedAt: now,
          nextReviewAt: reviewAt,
          attemptsCount: (prior?.attemptsCount ?? 0) + 1,
          correctCount: (prior?.correctCount ?? 0) + (isCorrect ? 1 : 0),
          updatedAt: now,
        },
      });

    return NextResponse.json({
      id: inserted!.id,
      isCorrect,
      isNearMiss,
      correctAnswer: question.answer,
      explanationMd: question.explanationMd,
      masteryUpdated: {
        subTopic: question.subTopic,
        masteryP: newP,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}

/**
 * 採点ロジック。選択肢・数値の両対応。
 * tolerance 内の数値誤答は near_miss=true。
 */
function scoreAttempt(
  q: { answer: unknown; isNumeric: boolean; numericTolerance: number | null },
  userAnswer: unknown,
): { isCorrect: boolean; isNearMiss: boolean; toleranceRatio: number } {
  if (q.isNumeric) {
    const correctValue =
      typeof q.answer === 'number'
        ? (q.answer as number)
        : ((q.answer as { value?: number })?.value ?? Number(q.answer));
    const userValue = typeof userAnswer === 'number'
      ? userAnswer
      : Number((userAnswer as { value?: number })?.value ?? userAnswer);
    if (Number.isNaN(userValue) || Number.isNaN(correctValue)) {
      return { isCorrect: false, isNearMiss: false, toleranceRatio: 1 };
    }
    const diff = Math.abs(userValue - correctValue);
    const tol = q.numericTolerance ?? 0;
    if (diff <= tol) {
      return { isCorrect: true, isNearMiss: false, toleranceRatio: 0 };
    }
    // tol*3 までを near_miss と定義(惜しい)
    const nearWindow = tol > 0 ? tol * 3 : Math.abs(correctValue) * 0.05;
    if (diff <= nearWindow) {
      return {
        isCorrect: false,
        isNearMiss: true,
        toleranceRatio: nearWindow === 0 ? 1 : diff / nearWindow,
      };
    }
    return { isCorrect: false, isNearMiss: false, toleranceRatio: 1 };
  }
  // 選択肢: answer が number / string / array
  const a = q.answer;
  const u = userAnswer;
  const isCorrect = JSON.stringify(a) === JSON.stringify(u);
  return { isCorrect, isNearMiss: false, toleranceRatio: 0 };
}
