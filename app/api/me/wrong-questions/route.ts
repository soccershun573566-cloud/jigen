/**
 * GET /api/me/wrong-questions
 * 認証ユーザーの間違えた問題リスト(直近100問・問題単位で最新の失敗1件)
 * - 「まだ正解していない」かどうかで絞らず、まずは「直近で間違えた問題」を全部出す
 * - 再演習・復習導線で活用
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();

    // ユーザーが間違えた最新 attempt 単位で問題を集計(同じ問題は最新の1件のみ)
    const result = await db.execute(sql`
      with latest_wrong as (
        select distinct on (question_id) question_id, attempted_at
        from attempts
        where user_id = ${user.id} and is_correct = false
        order by question_id, attempted_at desc
      )
      select q.id, q.section, q.sub_topic, q.body_md, lw.attempted_at,
             (select count(*) from attempts a2 where a2.user_id = ${user.id} and a2.question_id = q.id and a2.is_correct = false)::int as wrong_count
      from latest_wrong lw
      join questions q on q.id = lw.question_id
      where q.published = true
      order by lw.attempted_at desc
      limit 100
    `);

    const rows =
      (result as unknown as { rows?: unknown[] }).rows ??
      (result as unknown as unknown[]);

    return NextResponse.json({ items: rows ?? [] });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
