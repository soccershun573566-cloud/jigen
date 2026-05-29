// AI 解説キャッシュ
// 技術構築計画§5.2(3層ガードの1層目)
// 同じ問題 × 同じ誤答パターンは ai_explanation_cache から再利用
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiExplanationCache } from '@/db/schema';

/**
 * キャッシュ取得。ヒットしたら hit_count++ して文字列を返す。
 * 監修者承認(reviewer_approved=true)を必須とする運用にしたい場合は
 * AI_CACHE_REQUIRE_APPROVED=1 を立てる。MVP 既定は緩め(全件再利用)。
 */
export async function cacheGet(
  questionId: string,
  wrongAnswerKey: string,
): Promise<string | null> {
  const requireApproved = process.env.AI_CACHE_REQUIRE_APPROVED === '1';
  const rows = await db
    .select()
    .from(aiExplanationCache)
    .where(
      and(
        eq(aiExplanationCache.questionId, questionId),
        eq(aiExplanationCache.wrongAnswerKey, wrongAnswerKey),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (requireApproved && !row.reviewerApproved) return null;

  // hit_count++(fire-and-forget でも可だが、待ってもコストは僅か)
  await db
    .update(aiExplanationCache)
    .set({ hitCount: sql`${aiExplanationCache.hitCount} + 1` })
    .where(eq(aiExplanationCache.id, row.id));
  return row.explanationMd;
}

/** upsert into ai_explanation_cache(同キーは無視 = 先勝ち) */
export async function cacheSet(
  questionId: string,
  wrongAnswerKey: string,
  explanationMd: string,
): Promise<void> {
  if (!explanationMd || explanationMd.trim().length === 0) return;
  try {
    await db
      .insert(aiExplanationCache)
      .values({
        questionId,
        wrongAnswerKey,
        explanationMd,
        hitCount: 0,
        reviewerApproved: false,
      })
      .onConflictDoNothing({
        target: [aiExplanationCache.questionId, aiExplanationCache.wrongAnswerKey],
      });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ai/cache] cacheSet failed', err);
  }
}

/** get → 無ければ producer を呼んで保存 → 結果を返す */
export async function cacheGetOrSet(
  questionId: string,
  wrongAnswerKey: string,
  producer: () => Promise<string>,
): Promise<{ value: string; cached: boolean }> {
  const cached = await cacheGet(questionId, wrongAnswerKey);
  if (cached) return { value: cached, cached: true };
  const value = await producer();
  await cacheSet(questionId, wrongAnswerKey, value);
  return { value, cached: false };
}

/** ユーザーの回答からキャッシュキーを生成。数値問題はレンジで丸める */
export function buildWrongAnswerKey(userAnswer: unknown, isNumeric: boolean): string {
  if (isNumeric) {
    const n =
      typeof userAnswer === 'number'
        ? userAnswer
        : Number((userAnswer as { value?: unknown })?.value ?? userAnswer);
    if (Number.isFinite(n)) {
      // 10% レンジで丸めて同質クラスタ化
      const rounded = Math.round(n * 10) / 10;
      return `num:${rounded}`;
    }
  }
  return `choice:${JSON.stringify(userAnswer ?? null)}`;
}
