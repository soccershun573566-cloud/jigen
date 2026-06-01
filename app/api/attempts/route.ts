/**
 * POST /api/attempts — 解答送信
 *
 * フロー:
 *   1) Supabase Server Client で認証
 *   2) zod 検証
 *   3) Question ロード(published=true のみ)
 *   4) 採点
 *   5) attempts INSERT(自分の user_id なので RLS attempts_self_insert で通る)
 *   6) BKT 更新 + mastery_profiles UPSERT(service_role 経由)
 *   7) SRS next_review_at 計算
 *   8) レスポンスに採点結果・正解・解説・次の推奨を返す
 *
 * ナギ側: types/api.ts の AttemptRequest / AttemptResponse を import すること。
 */
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { questions, attempts, masteryProfiles } from '@/db/schema';
import { AttemptRequest } from '@/types/api';
import { updateMastery, defaultBktParams } from '@/lib/learning/bkt';
import {
  deriveQuality,
  nextReviewAt,
  nextReviewForNumeric,
} from '@/lib/learning/srs';

export const dynamic = 'force-dynamic';

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
    // 進捗カウント分離用 source(クライアントから明示・デフォルト 'daily')
    const source: 'daily' | 'mistakes' | 'other' = parsed.data.source ?? 'daily';

    // 公開問題のみ採点対象
    const [question] = await db
      .select()
      .from(questions)
      .where(and(eq(questions.id, questionId), eq(questions.published, true)))
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

    // attempts INSERT(RLS attempts_self_insert で通る) — source も保存
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
        source,
      })
      .returning();

    // 既存 mastery 取得(self_select で通る)
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

    // SRS quality → next_review_at
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

    // mastery_profiles UPSERT は service_role 経由
    //   RLS は self_select のみ。insert/update ポリシーが無いので
    //   anon/auth ロールでは通らない → admin client(service_role)で貫通。
    const admin = createAdminClient();
    const { error: upsertErr } = await admin
      .from('mastery_profiles')
      .upsert(
        {
          user_id: user.id,
          sub_topic: question.subTopic,
          mastery_p: newP,
          last_practiced_at: now.toISOString(),
          next_review_at: reviewAt.toISOString(),
          attempts_count: (prior?.attemptsCount ?? 0) + 1,
          correct_count: (prior?.correctCount ?? 0) + (isCorrect ? 1 : 0),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id,sub_topic' },
      );
    if (upsertErr) {
      return NextResponse.json(
        {
          error: {
            code: 'mastery_upsert_failed',
            message: upsertErr.message,
          },
        },
        { status: 500 },
      );
    }

    // 次の推奨(任意・null可)
    //   - 不正解 or near_miss なら同じ sub_topic を勧める
    //   - 正答&レビュー間隔伸びたら次のランダム問題
    const nextRecommendation = !isCorrect
      ? {
          reason: 'review_same_topic' as const,
          subTopic: question.subTopic,
          href: '/practice/next',
        }
      : {
          reason: 'next_random' as const,
          subTopic: null,
          href: '/practice/next',
        };

    return NextResponse.json({
      id: inserted!.id,
      isCorrect,
      isNearMiss,
      correctAnswer: question.answer,
      explanation: question.explanationMd,
      // 後方互換(既存呼び出し対策): explanationMd キーも残す
      explanationMd: question.explanationMd,
      masteryUpdated: {
        subTopic: question.subTopic,
        masteryP: newP,
      },
      nextRecommendation,
      // 一時デバッグ情報(原因特定後に削除)
      _debug: {
        rawUserAnswer: userAnswer,
        rawCorrectAnswer: question.answer,
        normalizedUser: normalizeAnswer(userAnswer),
        normalizedCorrect: normalizeAnswer(question.answer),
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
    const userValue =
      typeof userAnswer === 'number'
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
  const isCorrect = normalizeAnswer(a) === normalizeAnswer(u);
  return { isCorrect, isNearMiss: false, toleranceRatio: 0 };
}

/**
 * 選択肢解答の正規化。
 * クライアントが number で投げても "1" 文字列で投げても比較できるよう統一。
 * 配列(複数選択)も sort して JSON 化。
 */
function normalizeAnswer(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object' && !Array.isArray(v)) {
    const obj = v as { value?: unknown; answer?: unknown };
    if (obj.value !== undefined) return normalizeAnswer(obj.value);
    if (obj.answer !== undefined) return normalizeAnswer(obj.answer);
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return JSON.stringify(v.map((x) => normalizeAnswer(x)).sort());
  }
  const s = String(v).trim();
  // 数字文字列なら数値化して正規化(例: " 3 " → "3", "03" → "3")
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return String(Number(s));
  }
  return s;
}
