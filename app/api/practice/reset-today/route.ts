/**
 * POST /api/practice/reset-today
 *
 * 「今日の問題」 進捗カウンタをリセットする。
 *   - users.daily_reset_at = now() を立てるだけ
 *   - attempts / mastery_profiles / 間違いリストは絶対に削除しない
 *   - リセット時刻以降の attempts だけが「今日の問題」 として再カウントされる
 *
 * 完了後、 クライアントは todaySolved を再取得すれば 0 になる。
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
