/**
 * POST /api/me/reset-today
 *
 * 「今日の進捗」 表示カウンタをリセットする。
 *
 * 【重要・絶対遵守】
 *   ❌ attempts は絶対に削除しない(間違いリスト・分析データの基礎)
 *   ❌ mastery_profiles は絶対に削除しない(学習プロファイル)
 *   ✅ users.daily_reset_at = now() を立てるだけ
 *   ✅ todaySolved 計算側で「daily_reset_at 以降の attempts のみカウント」 する
 *
 * 旧実装は attempts を DELETE していたため、 間違いリスト・分析データが消える
 * 致命バグになっていた。 これを修正。
 */
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await requireUser();
    await db
      .update(users)
      .set({ dailyResetAt: new Date(), lastMilestoneSeen: 0 })
      .where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
