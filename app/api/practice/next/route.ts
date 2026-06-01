/**
 * GET /api/practice/next
 * 適応的に問題を出題:
 *   - 50% の確率で「2日以上前+未解除の間違え」を優先(復習)
 *   - 残り50% は「教科×小単元の弱点重み」で重み付きランダム
 *     - 各 (section, sub_topic) ごとに正答率を集計
 *     - 弱点ほど weight 高(1 - 正答率、最低0.2)
 *     - データ少(<5問)の領域は重み0.5(中程度)
 *     - PostgreSQL の `order by random() * weight desc limit 1` で重み付き選択
 *   - 直近24h挑戦済を除外
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

    // 50% の確率で復習問題(2日以上前+未解除間違え)
    if (Math.random() < 0.5) {
      row = await pickReviewDue(user.id);
    }

    if (!row) {
      // 弱点重み付きの adaptive 出題
      row = await pickAdaptive(user.id);
    }
    if (!row) {
      // 完全フォールバック
      row = await pickRandomFallback();
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
 * 復習対象(2日間隔・未解除の間違え)
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
             bool_or(case when rn=1 then is_correct end) as last1,
             bool_or(case when rn=2 then is_correct end) as last2,
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
      and (lt.last1 is not true or lt.last2 is not true)
      and lt.last_attempt < now() - interval '2 days'
    order by random()
    limit 1
  `);
  return extractRow(result);
}

/**
 * 適応的出題(段階1+2):
 *   - 教科×小単元の弱点重みで重み付きランダム
 *   - データ少領域は中程度(0.5)
 *   - 直近24h挑戦済は除外
 */
async function pickAdaptive(userId: string): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    with user_perf as (
      select q.section, q.sub_topic,
             count(*)::int as total,
             count(*) filter (where a.is_correct)::int as correct
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId}
      group by q.section, q.sub_topic
    )
    select q.id, q.year, q.q_number, q.section, q.sub_topic, q.difficulty,
           q.body_md, q.choices, q.is_numeric
    from questions q
    left join user_perf up on up.section = q.section and up.sub_topic = q.sub_topic
    where q.published = true
      and q.id not in (
        select question_id from attempts
        where user_id = ${userId} and attempted_at > now() - interval '24 hours'
      )
    order by random() *
      case
        when up.total is null or up.total < 5 then 0.5
        else greatest(0.2, 1.0 - up.correct::float / nullif(up.total, 0))
      end desc
    limit 1
  `);
  return extractRow(result);
}

async function pickRandomFallback(): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    select id, year, q_number, section, sub_topic, difficulty, body_md, choices, is_numeric
    from questions
    where published = true
    order by random()
    limit 1
  `);
  return extractRow(result);
}
