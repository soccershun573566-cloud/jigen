/**
 * GET /api/practice/next
 * ランダムに公開問題1件を取得して返す(回答前なので answer / explanation は返さない)。
 *
 * 仕様:
 *   - 認証必須(Supabase Server Client 経由)。未認証は 401。
 *   - 直近24時間に attempts に記録のある question は除外。
 *   - 全部「最近やった」なら 24h 制約を外して再度ランダム1問。
 *   - レスポンスに「全公開問題のうち今日未挑戦の問題数」も含める(ナギ側で残数表示に使う)。
 *
 * ナギ側: types/api.ts の PracticeNextResponse を import すること。
 */
import { NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { questions, attempts } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = await requireUser();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 直近24h で挑戦済の questionId 集合
    const recentAttempts = await db
      .select({ questionId: attempts.questionId })
      .from(attempts)
      .where(
        and(eq(attempts.userId, user.id), gte(attempts.attemptedAt, since)),
      );
    const recentIds = Array.from(
      new Set(recentAttempts.map((a) => a.questionId)),
    );

    // 残数(今日未挑戦の公開問題数)
    const totalPublishedRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(questions)
      .where(eq(questions.published, true));
    const totalPublished = totalPublishedRows[0]?.c ?? 0;
    const remainingToday = Math.max(0, totalPublished - recentIds.length);

    // まずは「直近24h で未挑戦の公開問題」からランダム1件
    let picked = await pickRandomPublished(recentIds);

    // 全て解き終わっていれば 24h 制約を外す
    if (!picked) {
      picked = await pickRandomPublished([]);
    }

    if (!picked) {
      return NextResponse.json(
        {
          error: {
            code: 'no_published_questions',
            message: '公開問題が見つかりません',
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: picked.id,
      year: picked.year,
      qNumber: picked.qNumber,
      section: picked.section,
      subTopic: picked.subTopic,
      difficulty: picked.difficulty,
      bodyMd: picked.bodyMd,
      choices: picked.choices,
      isNumeric: picked.isNumeric,
      remainingToday,
      totalPublished,
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
 * 公開問題から、除外IDを除いてランダム1件取得。
 * PostgreSQL の `ORDER BY random()` を Drizzle の sql テンプレートで使う。
 * 1425件規模なら index + filter + random() ソートで十分高速。
 */
async function pickRandomPublished(excludeIds: string[]) {
  // 除外句は in-list が空のとき構文エラーになるので分岐
  const rows = excludeIds.length
    ? await db
        .select()
        .from(questions)
        .where(
          sql`${questions.published} = true and ${questions.id} <> all(${excludeIds}::uuid[])`,
        )
        .orderBy(sql`random()`)
        .limit(1)
    : await db
        .select()
        .from(questions)
        .where(eq(questions.published, true))
        .orderBy(sql`random()`)
        .limit(1);
  return rows[0] ?? null;
}
