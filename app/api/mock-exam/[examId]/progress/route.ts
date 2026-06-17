/**
 * POST /api/mock-exam/[examId]/progress
 * 模試の進捗(現在の問題index + 回答)を保存。 中断時に呼び出し。
 * リクエスト: { currentIndex: number, answers: Record<string, number> }
 *   - currentIndex: 0始まりの問題インデックス
 *   - answers: { "1": 3, "2": 4, ... } のように 問題順 → 選択した選択肢番号
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ProgressRequest = z.object({
  currentIndex: z.number().int().min(0),
  // 一般問題は number、 応用問題は number[](長さ2)
  answers: z.record(z.string(), z.union([
    z.number().int().min(1).max(5),
    z.array(z.number().int().min(1).max(5)).length(2),
  ])),
});

export async function POST(req: Request, ctx: { params: Promise<{ examId: string }> }) {
  try {
    const user = await requireUser();
    const { examId } = await ctx.params;
    const parsed = ProgressRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    const { currentIndex, answers } = parsed.data;

    // 既存の attempt があれば update, なければ insert(upsert)
    await db.execute(sql`
      insert into mock_attempts (user_id, mock_exam_id, current_question_index, answers, started_at)
      values (
        ${user.id}::uuid,
        ${examId},
        ${currentIndex},
        ${JSON.stringify(answers)}::jsonb,
        now()
      )
      on conflict (user_id, mock_exam_id) do update set
        current_question_index = excluded.current_question_index,
        answers = excluded.answers
      -- 完了済(completed_at is not null)の場合は上書きしない
    `);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
