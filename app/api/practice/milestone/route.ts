/**
 * GET /api/practice/milestone
 *
 * 「今日の問題」 の 25問区切り画面の表示判定+データ取得を 1往復で行う。
 *
 * フロー:
 *   1) 今日(JST)の attempts 数(source='daily'・daily_reset_at 以降) を集計
 *   2) currentMilestone = floor(todaySolved / 25)
 *   3) users.last_milestone_seen を取得
 *   4) currentMilestone <= lastSeen なら shouldShow=false で早期return
 *   5) shouldShow=true なら直近の節目分(=25問) の間違い問題リストを返す
 *
 * クライアント側は「解答送信成功 → 次の問題取得時」 に呼び出し、
 * shouldShow=true なら区切り画面を出す。 閉じた後に POST /mark-seen で確定。
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STEP = 25; // 何問ごとの節目か(=25問)

type MistakeRow = {
  question_id: string;
  section: string;
  sub_topic: string;
  body_md: string;
  choices: unknown;
  answer: unknown;
  explanation_md: string;
  user_answer: unknown;
  attempted_at: string;
  short_explanation: string | null;
  key_point: string | null;
  fill_in_question: string | null;
  fill_in_answers: unknown;
};

function parseJsonbField<T = unknown>(raw: unknown): T {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch { return raw as T; }
  }
  return raw as T;
}

export async function GET() {
  try {
    const user = await requireUser();

    // ユーザー情報(daily_reset_at, last_milestone_seen) と今日の attempts 数を並列取得
    const [userR, countR] = await Promise.all([
      db.execute(sql`
        select daily_reset_at, last_milestone_seen
        from users where id = ${user.id}::uuid limit 1
      `).catch(() => null),
      db.execute(sql`
        select count(*)::int as c
        from attempts a
        left join users u on u.id = a.user_id
        where a.user_id = ${user.id}::uuid
          and a.source = 'daily'
          and (a.attempted_at at time zone 'Asia/Tokyo')::date
              = (now() at time zone 'Asia/Tokyo')::date
          and (u.daily_reset_at is null or a.attempted_at > u.daily_reset_at)
      `).catch(() => null),
    ]);

    const userRows = ((userR as unknown as { rows?: Array<{ daily_reset_at: string | null; last_milestone_seen: number }> }).rows
      ?? (userR as unknown as Array<{ daily_reset_at: string | null; last_milestone_seen: number }>));
    const u = userRows?.[0];
    const lastSeen = u?.last_milestone_seen ?? 0;

    const countRows = ((countR as unknown as { rows?: { c: number }[] }).rows
      ?? (countR as unknown as { c: number }[]));
    const todaySolved = countRows?.[0]?.c ?? 0;

    const currentMilestone = Math.floor(todaySolved / STEP);

    // まだ次の節目に到達してない or 既に見た節目 → 表示しない
    if (currentMilestone <= lastSeen) {
      return NextResponse.json({
        shouldShow: false,
        currentMilestone,
        lastSeen,
        todaySolved,
      });
    }

    // 直近の節目分(最後25問) のうち間違えた問題を取得
    // (currentMilestone-1)*25 〜 currentMilestone*25 番目の attempts を見る
    const offset = (currentMilestone - 1) * STEP;
    const mistakesResult = await db.execute(sql`
      with target_attempts as (
        select a.id, a.question_id, a.user_answer, a.is_correct, a.attempted_at
        from attempts a
        left join users u on u.id = a.user_id
        where a.user_id = ${user.id}::uuid
          and a.source = 'daily'
          and (a.attempted_at at time zone 'Asia/Tokyo')::date
              = (now() at time zone 'Asia/Tokyo')::date
          and (u.daily_reset_at is null or a.attempted_at > u.daily_reset_at)
        order by a.attempted_at asc
        limit ${STEP} offset ${offset}
      )
      select q.id as question_id, q.section, q.sub_topic, q.body_md,
             q.choices, q.answer, q.explanation_md,
             ta.user_answer, ta.attempted_at,
             qs.short_explanation, qs.key_point,
             qs.fill_in_question, qs.fill_in_answers
      from target_attempts ta
      join questions q on q.id = ta.question_id
      left join question_summaries qs on qs.question_id = q.id
      where ta.is_correct = false
      order by ta.attempted_at asc
    `);

    const mistakeRows = ((mistakesResult as unknown as { rows?: MistakeRow[] }).rows
      ?? (mistakesResult as unknown as MistakeRow[])) ?? [];

    const mistakes = mistakeRows.map((r) => {
      const choices = parseJsonbField<string[] | { items?: string[] }>(r.choices);
      const choicesArr = Array.isArray(choices)
        ? choices
        : (choices && typeof choices === 'object' && Array.isArray(choices.items) ? choices.items : []);
      return {
        questionId: r.question_id,
        section: r.section,
        subTopic: r.sub_topic,
        bodyMd: r.body_md,
        choices: choicesArr,
        explanationMd: r.explanation_md,
        // サマリ(AI生成キャッシュ・なければ null) — クライアント側で個別取得を試みる
        shortExplanation: r.short_explanation,
        keyPoint: r.key_point,
        fillInQuestion: r.fill_in_question,
        fillInAnswers: r.fill_in_answers
          ? (parseJsonbField(r.fill_in_answers) as Array<{ idx: number; answer: string; aliases: string[] }>)
          : null,
      };
    });

    return NextResponse.json({
      shouldShow: true,
      currentMilestone,
      lastSeen,
      todaySolved,
      questionsInWindow: STEP,
      mistakesCount: mistakes.length,
      mistakes,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
