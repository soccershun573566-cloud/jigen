/**
 * GET /api/practice/next
 *
 * ── ジゲンAI v2 ── 段階1〜5 統合出題エンジン + 応用問題30%保証
 *
 * 【出題プール】
 *   A) 復習(2日以上前+未解除の間違え)
 *   B) SRS(過去に正解、推奨復習日が過ぎた問題 / 忘却曲線)
 *   C) Adaptive+ZPD(教科×小単元の弱点 × 適度な難易度)
 *   D) 応用問題(is_applied=true・五肢二択)— 1日ノルマの30%を必ず確保
 *
 * 【応用30%保証ロジック】
 *   quotaApplied = ceil(todayTarget × 0.3)
 *   needApplied  = quotaApplied - 今日解いた応用数
 *   remaining    = todayTarget  - 今日解いた総数
 *   - needApplied >= remaining → 必ず応用(残り全部応用にしないと間に合わない)
 *   - needApplied >  0          → 確率 (needApplied / remaining) で応用
 *   - needApplied <= 0          → 通常3プール(応用ノルマ達成済)
 *
 * 【フェーズ判定】 試験日からの残り日数で出題比率を変える
 *   - 試験日未設定 or 残り>90日(基礎フェーズ): A35% / B15% / C50%
 *   - 残り30-90日(弱点強化フェーズ):           A30% / B25% / C45%
 *   - 残り0-30日(直前フェーズ):                A50% / B30% / C20%
 *   - 試験当日経過後:                          A40% / B30% / C30%
 *
 * 共通: 直近24h挑戦済を除外
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
  is_applied: boolean;
};

type PhaseWeights = { review: number; srs: number; adaptive: number };

const DEFAULT_TODAY_TARGET = 25;
const APPLIED_RATIO = 0.2;

async function getUserMetrics(userId: string): Promise<{
  todayTarget: number;
  weights: PhaseWeights;
  todaySolved: number;
  appliedSolved: number;
}> {
  const [usersR, countR] = await Promise.all([
    db.execute(sql`
      select daily_target_questions,
             daily_reset_at,
             case when target_exam_date is null then null
                  else (target_exam_date - current_date)::int end as days_left
      from users where id = ${userId} limit 1
    `).catch(() => null),
    db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where q.is_applied = true)::int as applied
      from attempts a
      left join questions q on q.id = a.question_id
      left join users u on u.id = a.user_id
      where a.user_id = ${userId}
        and a.source = 'daily'
        and (a.attempted_at at time zone 'Asia/Tokyo')::date
            = (now() at time zone 'Asia/Tokyo')::date
        and (u.daily_reset_at is null or a.attempted_at > u.daily_reset_at)
    `).catch(() => null),
  ]);

  const userRows = usersR
    ? ((usersR as unknown as { rows?: Array<{ daily_target_questions: number | null; days_left: number | null }> }).rows
        ?? (usersR as unknown as Array<{ daily_target_questions: number | null; days_left: number | null }>))
    : [];
  const u = userRows?.[0];
  const v = u?.daily_target_questions;
  const todayTarget = typeof v === 'number' && v > 0 ? v : DEFAULT_TODAY_TARGET;
  const daysLeft = u?.days_left ?? null;
  const weights = weightsFromDaysLeft(daysLeft);

  const countRows = countR
    ? ((countR as unknown as { rows?: { total: number; applied: number }[] }).rows ?? (countR as unknown as { total: number; applied: number }[]))
    : [];
  const todaySolved = countRows?.[0]?.total ?? 0;
  const appliedSolved = countRows?.[0]?.applied ?? 0;

  return { todayTarget, weights, todaySolved, appliedSolved };
}

function weightsFromDaysLeft(daysLeft: number | null): PhaseWeights {
  if (daysLeft == null) return { review: 0.35, srs: 0.15, adaptive: 0.50 };
  if (daysLeft < 0)    return { review: 0.40, srs: 0.30, adaptive: 0.30 };
  if (daysLeft <= 30)  return { review: 0.50, srs: 0.30, adaptive: 0.20 };
  if (daysLeft <= 90)  return { review: 0.30, srs: 0.25, adaptive: 0.45 };
  return                       { review: 0.35, srs: 0.15, adaptive: 0.50 };
}

/** 応用問題を出すか判定(30%ノルマ保証) */
function shouldServeApplied(m: { todayTarget: number; todaySolved: number; appliedSolved: number }): boolean {
  const quotaApplied = Math.ceil(m.todayTarget * APPLIED_RATIO);
  const needApplied = quotaApplied - m.appliedSolved;
  const remaining = m.todayTarget - m.todaySolved;
  if (needApplied <= 0) return false;
  if (remaining <= 0) return false;
  if (needApplied >= remaining) return true;
  return Math.random() < needApplied / remaining;
}

export async function GET() {
  try {
    const user = await requireUser();

    const [metrics, reviewRow, srsRow, adaptiveRow, appliedRow] = await Promise.all([
      getUserMetrics(user.id),
      pickReviewDue(user.id).catch(() => null),
      pickSrsDue(user.id).catch(() => null),
      pickAdaptiveZpd(user.id).catch(() => null),
      pickAppliedZpd(user.id).catch(() => null),
    ]);

    let row: QuestionRow | null;

    if (shouldServeApplied(metrics) && appliedRow) {
      row = appliedRow;
    } else {
      const r = Math.random();
      const thresholdReview = metrics.weights.review;
      const thresholdSrs = metrics.weights.review + metrics.weights.srs;
      if (r < thresholdReview) row = reviewRow ?? srsRow ?? adaptiveRow ?? appliedRow;
      else if (r < thresholdSrs) row = srsRow ?? adaptiveRow ?? reviewRow ?? appliedRow;
      else row = adaptiveRow ?? srsRow ?? reviewRow ?? appliedRow;
    }

    if (!row) row = await pickRandomFallback();

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
      choices: parseJsonb(row.choices),
      isNumeric: row.is_numeric,
      isApplied: row.is_applied,
      remainingToday: null,
      totalPublished: null,
      todaySolved: metrics.todaySolved,
      todayTarget: metrics.todayTarget,
      appliedSolved: metrics.appliedSolved,
      appliedQuota: Math.ceil(metrics.todayTarget * APPLIED_RATIO),
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
  const rows = (result as { rows?: QuestionRow[] }).rows ?? (result as QuestionRow[]);
  return rows && rows.length > 0 ? (rows[0] ?? null) : null;
}

/** raw SQL から取得した jsonb 列は文字列で返るため、 配列/オブジェクトへ復元 */
function parseJsonb(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

/** プールA: 復習(2日以上前+未解除の間違え) */
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
           q.body_md, q.choices, q.is_numeric, q.is_applied
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

/** プールB: SRS(忘却曲線) */
async function pickSrsDue(userId: string): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    with attempt_seq as (
      select question_id, is_correct, attempted_at,
             row_number() over (partition by question_id order by attempted_at desc) as rn
      from attempts where user_id = ${userId}
    ),
    last_wrong as (
      select question_id, min(rn) as wrong_rn
      from attempt_seq where is_correct = false
      group by question_id
    ),
    streak as (
      select s.question_id,
             count(*) filter (
               where s.is_correct = true
                 and s.rn < coalesce((select wrong_rn from last_wrong lw where lw.question_id = s.question_id), 999)
             )::int as correct_streak,
             max(s.attempted_at) as last_attempt
      from attempt_seq s
      group by s.question_id
    )
    select q.id, q.year, q.q_number, q.section, q.sub_topic, q.difficulty,
           q.body_md, q.choices, q.is_numeric, q.is_applied
    from streak st
    join questions q on q.id = st.question_id
    where q.published = true
      and st.correct_streak >= 1
      and (now() - st.last_attempt) >
        case st.correct_streak
          when 1 then interval '1 day'
          when 2 then interval '3 days'
          when 3 then interval '7 days'
          when 4 then interval '14 days'
          when 5 then interval '30 days'
          else interval '60 days'
        end
      and q.id not in (
        select question_id from attempts
        where user_id = ${userId} and attempted_at > now() - interval '24 hours'
      )
    order by random()
    limit 1
  `);
  return extractRow(result);
}

/** プールC: Adaptive + ZPD(通常問題のみ) */
async function pickAdaptiveZpd(userId: string): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    with user_perf_sub as (
      select q.section, q.sub_topic,
             count(*)::int as total,
             count(*) filter (where a.is_correct)::int as correct
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId} and q.is_applied = false
      group by q.section, q.sub_topic
    ),
    user_perf_section as (
      select q.section,
             count(*)::int as total,
             count(*) filter (where a.is_correct)::int as correct
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId} and q.is_applied = false
      group by q.section
    ),
    q_stats as (
      select question_id,
             count(*)::int as total_attempts,
             (count(*) filter (where is_correct)::float / count(*))::float as global_rate
      from attempts
      group by question_id
      having count(*) >= 3
    )
    select q.id, q.year, q.q_number, q.section, q.sub_topic, q.difficulty,
           q.body_md, q.choices, q.is_numeric, q.is_applied
    from questions q
    left join user_perf_sub ups on ups.section = q.section and ups.sub_topic = q.sub_topic
    left join user_perf_section upsec on upsec.section = q.section
    left join q_stats qs on qs.question_id = q.id
    where q.published = true
      and q.is_applied = false
      and q.id not in (
        select question_id from attempts
        where user_id = ${userId} and attempted_at > now() - interval '24 hours'
      )
    order by random() *
      (case
        when ups.total is null or ups.total < 5 then 0.5
        else greatest(0.2, 1.0 - ups.correct::float / nullif(ups.total, 0))
      end)
      *
      (1.0 / (
        abs(
          coalesce(qs.global_rate, 0.5)
          - greatest(0.3, least(0.85,
              coalesce(upsec.correct::float / nullif(upsec.total, 0), 0.5) - 0.1
            ))
        ) + 0.15
      ))
      desc
    limit 1
  `);
  return extractRow(result);
}

/** プールD: 応用問題(五肢二択・is_applied=true)— ZPDで弱点中分類優先 */
async function pickAppliedZpd(userId: string): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    with user_perf_sub as (
      select q.sub_topic,
             count(*)::int as total,
             count(*) filter (where a.is_correct)::int as correct
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId} and q.is_applied = true
      group by q.sub_topic
    )
    select q.id, q.year, q.q_number, q.section, q.sub_topic, q.difficulty,
           q.body_md, q.choices, q.is_numeric, q.is_applied
    from questions q
    left join user_perf_sub ups on ups.sub_topic = q.sub_topic
    where q.published = true
      and q.is_applied = true
      and q.id not in (
        select question_id from attempts
        where user_id = ${userId} and attempted_at > now() - interval '24 hours'
      )
    order by random() *
      (case
        when ups.total is null or ups.total < 3 then 0.6
        else greatest(0.2, 1.0 - ups.correct::float / nullif(ups.total, 0))
      end)
      desc
    limit 1
  `);
  return extractRow(result);
}

async function pickRandomFallback(): Promise<QuestionRow | null> {
  const result = await db.execute(sql`
    select id, year, q_number, section, sub_topic, difficulty, body_md, choices, is_numeric, is_applied
    from questions
    where published = true
    order by random()
    limit 1
  `);
  return extractRow(result);
}
