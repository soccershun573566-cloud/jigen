/**
 * POST /api/me/nickname
 * users.display_name を更新
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? '').trim();
    if (name.length === 0 || name.length > 30) {
      return NextResponse.json(
        { error: { code: 'invalid_name', message: 'ニックネームは1〜30文字で入力してください' } },
        { status: 400 },
      );
    }
    await db.execute(sql`
      update users set display_name = ${name}, updated_at = now()
      where id = ${user.id}
    `);
    return NextResponse.json({ name });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
