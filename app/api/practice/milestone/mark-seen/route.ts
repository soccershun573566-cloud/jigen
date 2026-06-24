/**
 * POST /api/practice/milestone/mark-seen
 *
 * 区切り画面を閉じたタイミングで呼び出し、 「最後に見た節目番号」 を更新する。
 *   - リクエストボディに { milestone: number } を含める
 *   - users.last_milestone_seen = max(現在値, リクエスト値) で更新(競合保護)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Body = z.object({ milestone: z.number().int().min(1) });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { milestone } = parsed.data;

    await db.execute(sql`
      update users
      set last_milestone_seen = greatest(last_milestone_seen, ${milestone})
      where id = ${user.id}::uuid
    `);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
