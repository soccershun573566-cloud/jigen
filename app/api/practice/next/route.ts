/**
 * GET /api/practice/next
 * ランダム公開問題1件を取得(回答前なので answer / explanation は返さない)。
 *
 * 高速化:
 *   - 1クエリ完結(attempts + questions を sub-query で除外)
 *   - count(*) は削除(残数表示はオプショナルなので不要)
 *   - ORDER BY random() は 1425件規模なら問題なし
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = await requireUser();

    // 1クエリで「直近24h未挑戦」を満たす公開問題からランダム1件
    // 全部解き終わってる場合は 24h 制約を外す second-pass を試す
    let row = await pickRandom(user.id, true);
    if (!row) row = await pickRandom(user.id, false);

    if (!row) {
      return NextResponse.json(
        {
          error: {
            code: 'no_published_questions',
            message: '公開問題が見つかりません',
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

  const rows = (result as unknown as { rows?: QuestionRow[] }).rows
    ?? (result as unknown as QuestionRow[]);
  return rows && rows.length > 0 ? (rows[0] ?? null) : null;
}
