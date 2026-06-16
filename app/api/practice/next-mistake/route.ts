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

    // 間違えリスト復習対象(2回連続正解で解除されていない問題)からランダム1件
    const result = await db.execute(sql`
      with attempt_seq as (
        select question_id, is_correct,
               row_number() over (partition by question_id order by attempted_at desc) as rn
        from attempts where user_id = ${user.id}
      ),
      last_two as (
        select question_id,
               bool_or(case when rn=1 then is_correct end) as last1,
               bool_or(case when rn=2 then is_correct end) as last2
        from attempt_seq where rn <= 2
        group by question_id
      ),
      ever_wrong as (
        select distinct question_id from attempts
        where user_id = ${user.id} and is_correct = false
      )
      select q.id, q.year, q.q_number, q.section, q.sub_topic, q.difficulty,
             q.body_md, q.choices, q.is_numeric
      from ever_wrong ew
      left join last_two lt on lt.question_id = ew.question_id
      join questions q on q.id = ew.question_id
      where q.published = true
        and (lt.last1 is not true or lt.last2 is not true)
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
      choices: typeof row.choices === 'string' ? (() => { try { return JSON.parse(row.choices as string); } catch { return row.choices; } })() : row.choices,
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
