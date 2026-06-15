/**
 * POST /api/weekly-test/progress — 金曜小テストの進捗保存(中断時)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Req = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentIndex: z.number().int().min(0),
  answers: z.record(z.string(), z.number().int().min(1).max(4)),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Req.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { weekStart, currentIndex, answers } = parsed.data;

    await db.execute(sql`
      update weekly_test_attempts
      set current_question_index = ${currentIndex},
          answers = ${JSON.stringify(answers)}::jsonb
      where user_id = ${user.id}::uuid
        and week_start = ${weekStart}::date
        and completed_at is null
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
