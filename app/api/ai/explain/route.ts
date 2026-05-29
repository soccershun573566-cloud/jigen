import { streamText } from 'ai';
import { and, desc, eq, gte } from 'drizzle-orm';
import { openai, MODEL_EXPLAIN } from '@/lib/ai/client';
import { SYSTEM_PROMPT_EXPLAIN, buildExplainPrompt } from '@/lib/ai/prompts';
import {
  checkBudgetOrThrow,
  checkUserDailyRateLimit,
  logUsage,
  BudgetExceededError,
  RateLimitError,
} from '@/lib/ai/budget';
import { cacheGet, cacheSet, buildWrongAnswerKey } from '@/lib/ai/cache';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { attempts, questions } from '@/db/schema';

// POST /api/ai/explain — 「なぜ間違えたか」ストリーミング SSE
// 技術構築計画§5.1
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ENDPOINT = 'explain';

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonError(500, 'config_error', 'OPENAI_API_KEY missing');
    }
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as {
      questionId?: string;
      userAnswer?: unknown;
    } | null;
    if (!body?.questionId) {
      return jsonError(400, 'validation_error', 'questionId required');
    }
    const { questionId, userAnswer } = body;

    // 問題ロード(isNumeric / 本文 / 選択肢 / 正解)
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    if (!question) {
      return jsonError(404, 'not_found', 'question not found');
    }

    // 予算 & レート制限(順序: 月予算 → ユーザー単位)
    await checkBudgetOrThrow();
    await checkUserDailyRateLimit(user.id, ENDPOINT);

    // キャッシュ判定
    const cacheKey = buildWrongAnswerKey(userAnswer, question.isNumeric);
    const cached = await cacheGet(questionId, cacheKey);
    if (cached) {
      // キャッシュヒットも使用量ログ(cached=true、cost=0)
      await logUsage({
        userId: user.id,
        endpoint: ENDPOINT,
        model: MODEL_EXPLAIN,
        promptTokens: 0,
        completionTokens: 0,
        cached: true,
      });
      return new Response(cached, {
        headers: { 'X-Cache': 'HIT', 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 直近 14 日の誤答からパターンを取り出す(最大 5 件)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentRows = await db
      .select({
        attemptedAt: attempts.attemptedAt,
        isCorrect: attempts.isCorrect,
        isNearMiss: attempts.isNearMiss,
        subTopic: questions.subTopic,
        isNumeric: questions.isNumeric,
      })
      .from(attempts)
      .innerJoin(questions, eq(attempts.questionId, questions.id))
      .where(
        and(
          eq(attempts.userId, user.id),
          eq(attempts.isCorrect, false),
          gte(attempts.attemptedAt, fourteenDaysAgo),
        ),
      )
      .orderBy(desc(attempts.attemptedAt))
      .limit(5);

    const recentMistakes = recentRows.map((r) => ({
      subTopic: r.subTopic,
      pattern: r.isNearMiss
        ? r.isNumeric
          ? '数値惜しい誤差'
          : '選択肢で迷い'
        : r.isNumeric
          ? '計算手順ずれ'
          : '誤選択',
    }));

    const result = streamText({
      model: openai(MODEL_EXPLAIN),
      system: SYSTEM_PROMPT_EXPLAIN,
      prompt: buildExplainPrompt({
        questionBody: question.bodyMd,
        choices: question.choices,
        correctAnswer: question.answer,
        userAnswer,
        isNumeric: question.isNumeric,
        recentMistakes,
      }),
      temperature: 0.3,
      maxTokens: 400,
      onFinish: async ({ usage, text }) => {
        await logUsage({
          userId: user.id,
          endpoint: ENDPOINT,
          model: MODEL_EXPLAIN,
          promptTokens: usage.promptTokens ?? 0,
          completionTokens: usage.completionTokens ?? 0,
        });
        if (text && text.trim().length > 0) {
          await cacheSet(questionId, cacheKey, text);
        }
      },
    });
    return result.toDataStreamResponse({
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof BudgetExceededError) {
      return jsonError(
        503,
        'budget_exceeded',
        'AI 解説は本日休止中。公式解説をご覧ください',
      );
    }
    if (err instanceof RateLimitError) {
      return jsonError(
        429,
        'rate_limited',
        '本日のAI解説リクエスト上限に到達しました',
      );
    }
    // eslint-disable-next-line no-console
    console.error('[api/ai/explain] error', err);
    return jsonError(500, 'internal_error', (err as Error).message);
  }
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
