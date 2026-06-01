/**
 * POST /api/me/reset-today
 *
 * 認証ユーザーの「今日(JST)分の attempts」を削除して、進捗を 0 に戻す。
 * mastery_profiles は触らない(学習履歴ベースのモデルは保持)。
 *
 * 用途: ホームの「リセット」ボタン(誤タップ防止のため2段階確認後に叩かれる)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await requireUser();

    const result = await db.execute(sql`
      delete from attempts
      where user_id = ${user.id}
        and attempted_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo')
    `);

    const deleted =
      (result as unknown as { rowCount?: number }).rowCount ??
      (result as unknown as { count?: number }).count ??
      0;

    return NextResponse.json({ deleted });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
