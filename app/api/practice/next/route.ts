/**
 * GET /api/practice/next
 * ランダム公開問題1件を取得。
 *
 * 出題ロジック:
 *   - 50% の確率で「間違えリスト復習対象」(間違えた問題 & 直近2回連続正解で解除されていない
 *                                          & 最終attempt が 2日以上前) を優先出題
 *   - 残りは通常ランダム(直近24h挑戦済を除外)
 *   - 復習対象がない/抽選外なら通常ランダム
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

    let row: QuestionRow | null = null;

    // 50% の確率で復習問題を優先
    if (Math.random() < 0.5) {
      row = await pickReviewDue(user.id);
    }

    if (!row) {
      row = await pickRandom(user.id, true);
    }
    if (!row) {
      row = await pickRandom(user.id, false);
    }

    if (!row) {
      return NextResponse.json(
        { error: { code: 'no_published_questions', message: '公開問題が見つかりません' } },
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
      remainingToday: null,
      totalPublished: null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}

function extractRow(result: unknown): QuestionRow | null {
  const rows =
    (result as { rows?: QuestionRow[] }).rows ??
    (result as QuestionRow[]);
  return rows && rows.length > 0 ? (rows[0] ?? null) : null;
}

/**
 * 復習対象(2日間隔):
 *   - 間違えたことがある
 *   - 直近2回連続正解で解除 ではない
 *   - 最終 attempt から 2日以上経過
 */
async function pickReviewDue(userId: string): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    with attempt_seq as (
      select question_id, is_correct, attempted_at,
             row_number() over (partition by question_id order by attempted_at desc) as rn
      from attempts where user_id = ${userId}
    ),
    last_two as (
      select question_id,
             max(case when rn=1 then is_correct end) as last1,
             max(case when rn=2 then is_correct end) as last2,
             max(case when rn=1 then attempted_at end) as last_attempt
      from attempt_seq where rn <= 2
      group by question_id
    ),
    ever_wrong as (
      select distinct question_id from attempts
      where user_id = ${userId} and is_correct = false
    )
    select q.id, q.year, q.q_number, q.section, q.sub_topic, q.difficulty,
           q.body_md, q.choices, q.is_numeric
    from ever_wrong ew
    join last_two lt on lt.question_id = ew.question_id
    join questions q on q.id = ew.question_id
    where q.published = true
      and not (lt.last1 is true and lt.last2 is true)
      and lt.last_attempt < now() - interval '2 days'
    order by random()
    limit 1
  `);
  return extractRow(result);
}

async function pickRandom(userId: string, excludeRecent: boolean): Promise<QuestionRow | null> {
  const result = excludeRecent
    ? await db.execute(sql`
        select id, year, q_number, section, sub_topic, difficulty, body_md, choices, is_numeric
        from questions
        where published = true
          and id not in (
            select question_id from attempts
            where user_id = ${userId}
              and attempted_at > now() - interval '24 hours'
          )
        order by random()
        limit 1
      `)
    : await db.execute(sql`
        select id, year, q_number, section, sub_topic, difficulty, body_md, choices, is_numeric
        from questions
        where published = true
        order by random()
        limit 1
      `);
  return extractRow(result);
}
