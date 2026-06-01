/**
 * GET /api/practice/next-mistake
 * ユーザーがまだ正解していない間違え問題からランダム1件取得
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type QuestionRow = {
  id: string;
  year: number;
  q_number: number;
  section: string;
  sub_topic: string;
  difficulty: number;
  body_md: string;
  choices: unknown;
  is_numeric: boolean;
};

export async function GET() {
  try {
    const user = await requireUser();

    // 「自分が間違えた + まだ正解していない」問題からランダム1件
    const result = await db.execute(sql`
      select id, year, q_number, section, sub_topic, difficulty, body_md, choices, is_numeric
      from questions
      where published = true
        and id in (
          select question_id from attempts
          where user_id = ${user.id} and is_correct = false
          group by question_id
          having not exists (
            select 1 from attempts a2
            where a2.user_id = ${user.id} and a2.question_id = attempts.question_id and a2.is_correct = true
          )
        )
      order by random()
      limit 1
    `);

    const rows =
      (result as unknown as { rows?: QuestionRow[] }).rows ??
      (result as unknown as QuestionRow[]);
    const row = rows && rows.length > 0 ? rows[0] : null;

    if (!row) {
      return NextResponse.json(
        {
          error: {
            code: 'no_mistakes',
            message: '復習対象の間違えがありません',
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: row.id,
      year: row.year,
      qNumber: row.q_number,
      section: row.section,
      subTopic: row.sub_topic,
      difficulty: row.difficulty,
      bodyMd: row.body_md,
      choices: row.choices,
      isNumeric: row.is_numeric,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
