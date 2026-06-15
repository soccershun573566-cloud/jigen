/**
 * GET /api/weekly-test — 今週の金曜小テスト情報を取得
 *   - 状態判定(月-木: 予告 / 金-日: 開催中 / 既受験: 結果)
 *   - 未受験で開催中なら 25問を動的生成して保存
 *
 * 仕様:
 *   - 毎週金曜0時(JST) 〜 翌週木曜23:59 が「今週」
 *   - 25問構成: 正解13問 + 不正解12問(直近7日のユーザー attempts から)
 *   - 重み: 直近7日の解答数の多い小単元を優先(試験直前ver の重視論点)
 *   - 1ユーザー1週1度・再受験不可
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Question = {
  id: string;
  body_md: string;
  choices: unknown;
  section: string;
  sub_topic: string;
  order_index: number;
};

// 今週の月曜日(JST)を返す: そこから金曜まで が「今週」
function getThisMonday(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay(); // 0=日,1=月,...,6=土
  const diff = day === 0 ? -6 : 1 - day; // 月曜まで戻す
  const monday = new Date(jst);
  monday.setUTCDate(jst.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// 今週の金曜日(JST)を返す: 月曜の +4日
function getThisFriday(monday: string): string {
  const m = new Date(monday + 'T00:00:00Z');
  m.setUTCDate(m.getUTCDate() + 4);
  return m.toISOString().slice(0, 10);
}

// 今日の JST 曜日 (0=日,5=金,6=土) を返す
function getJstDayOfWeek(): number {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCDay();
}

// JST の今日の日付(YYYY-MM-DD)
function getJstToday(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const user = await requireUser();
    const monday = getThisMonday();
    const friday = getThisFriday(monday);
    const today = getJstToday();
    const day = getJstDayOfWeek();
    // 開催中判定: 金(5)/土(6)/日(0) = 受験可
    // 月-木(1-4) = 予告のみ
    const isOpen = day === 5 || day === 6 || day === 0;
    const daysToFriday = day >= 1 && day <= 4 ? (5 - day) : 0;

    // 既存の今週の attempt 取得
    const existR = await db.execute(sql`
      select id::text as id, question_ids, answers,
             current_question_index, score, section_scores,
             to_char(started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as started_at,
             to_char(completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at
      from weekly_test_attempts
      where user_id = ${user.id}::uuid and week_start = ${monday}::date
      limit 1
    `);
    const existRows = (existR as unknown as { rows?: unknown[] }).rows ?? (existR as unknown as unknown[]);
    const existing = existRows?.[0] as {
      id: string;
      question_ids: string[];
      answers: Record<string, number>;
      current_question_index: number;
      score: number | null;
      section_scores: unknown;
      started_at: string;
      completed_at: string | null;
    } | undefined;

    // 既存 attempt がある場合は問題リストもロードして返す
    if (existing) {
      // 問題本文取得(順序を question_ids 順で揃える)
      const ids = existing.question_ids ?? [];
      let questions: Question[] = [];
      if (ids.length > 0) {
        const qR = await db.execute(sql`
          select id::text as id, body_md, choices, section, sub_topic
          from questions where id = any(${ids}::uuid[])
        `);
        const qRows = (qR as unknown as { rows?: Array<Omit<Question, 'order_index'>> }).rows
          ?? (qR as unknown as Array<Omit<Question, 'order_index'>>);
        const map = new Map((qRows ?? []).map(q => [q.id, q]));
        questions = ids.map((id, i) => {
          const q = map.get(id);
          return q ? { ...q, order_index: i + 1 } : null;
        }).filter(Boolean) as Question[];
      }

      return NextResponse.json({
        monday, friday, isOpen, daysToFriday, today,
        status: existing.completed_at ? 'completed' : 'in_progress',
        attempt: existing,
        questions,
      });
    }

    // attempt 未作成 + 開催前 → 予告のみ
    if (!isOpen) {
      return NextResponse.json({
        monday, friday, isOpen, daysToFriday, today,
        status: 'upcoming',
        attempt: null,
        questions: [],
      });
    }

    // 開催中 + 未作成 → 25問動的生成して保存
    const generated = await generateQuestions(user.id);
    if (generated.length === 0) {
      return NextResponse.json({
        monday, friday, isOpen, daysToFriday, today,
        status: 'no_data',
        message: '直近7日間に問題を解いた記録がないため、 今週は出題できません。 来週もう一度ご確認ください。',
        attempt: null,
        questions: [],
      });
    }

    const ids = generated.map(q => q.id);
    await db.execute(sql`
      insert into weekly_test_attempts (user_id, week_start, question_ids)
      values (${user.id}::uuid, ${monday}::date, ${JSON.stringify(ids)}::jsonb)
      on conflict (user_id, week_start) do nothing
    `);

    // 念のため再取得
    const newR = await db.execute(sql`
      select id::text as id, question_ids, answers,
             current_question_index, score, section_scores,
             to_char(started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as started_at,
             to_char(completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at
      from weekly_test_attempts
      where user_id = ${user.id}::uuid and week_start = ${monday}::date
      limit 1
    `);
    const newRows = (newR as unknown as { rows?: unknown[] }).rows ?? (newR as unknown as unknown[]);
    const newAttempt = newRows?.[0];

    return NextResponse.json({
      monday, friday, isOpen, daysToFriday, today,
      status: 'available',
      attempt: newAttempt,
      questions: generated.map((q, i) => ({ ...q, order_index: i + 1 })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}

/**
 * 25問動的生成:
 *   - 直近7日に正解した問題から 13問
 *   - 直近7日に間違えた問題から 12問
 *   - 重み: 直近7日の解答数が多い小単元を優先(試験直前ver の重視論点反映)
 */
async function generateQuestions(userId: string): Promise<Omit<Question, 'order_index'>[]> {
  // 1) 直近7日にユーザーが触れた問題を、 「正解 / 不正解」 で振り分け
  //    最新の試行で is_correct を判定(同じ問題を複数回解いた場合)
  //    + 小単元別の重み(直近7日の解答数)も同時取得
  const result = await db.execute(sql`
    with recent_attempts as (
      select a.question_id, a.is_correct, a.attempted_at,
             row_number() over (partition by a.question_id order by a.attempted_at desc) as rn,
             q.section, q.sub_topic, q.body_md, q.choices, q.id::text as qid
      from attempts a
      join questions q on q.id = a.question_id
      where a.user_id = ${userId}::uuid
        and a.attempted_at >= now() - interval '7 days'
        and q.published = true
    ),
    latest as (
      select * from recent_attempts where rn = 1
    ),
    subtopic_weight as (
      select section, sub_topic, count(*)::int as w
      from recent_attempts
      group by section, sub_topic
    ),
    enriched as (
      select l.qid as id, l.body_md, l.choices, l.section, l.sub_topic, l.is_correct,
             coalesce(sw.w, 1) as weight
      from latest l
      left join subtopic_weight sw on sw.section = l.section and sw.sub_topic = l.sub_topic
    )
    select id, body_md, choices, section, sub_topic, is_correct, weight
    from enriched
  `);
  const rows = (result as unknown as { rows?: Array<Omit<Question, 'order_index'> & { is_correct: boolean; weight: number }> }).rows
    ?? (result as unknown as Array<Omit<Question, 'order_index'> & { is_correct: boolean; weight: number }>);
  const all = rows ?? [];

  const correct = all.filter(r => r.is_correct);
  const wrong = all.filter(r => !r.is_correct);

  // 重み付きランダムサンプル(weight × random)
  function weightedSample<T extends { weight: number }>(arr: T[], n: number): T[] {
    const copy = arr.map(x => ({ ...x, sortKey: -Math.random() * x.weight }));
    copy.sort((a, b) => a.sortKey - b.sortKey);
    return copy.slice(0, n);
  }

  const TARGET_CORRECT = 13;
  const TARGET_WRONG = 12;
  let pickedCorrect = weightedSample(correct, TARGET_CORRECT);
  let pickedWrong = weightedSample(wrong, TARGET_WRONG);

  // 片方が不足したら他方で補完(合計25問狙い)
  const deficit = (TARGET_CORRECT - pickedCorrect.length) + (TARGET_WRONG - pickedWrong.length);
  if (deficit > 0) {
    const used = new Set([...pickedCorrect, ...pickedWrong].map(x => x.id));
    const pool = all.filter(r => !used.has(r.id));
    const supplement = weightedSample(pool, deficit);
    if (pickedCorrect.length < TARGET_CORRECT) {
      pickedCorrect = [...pickedCorrect, ...supplement.slice(0, TARGET_CORRECT - pickedCorrect.length)];
    }
    if (pickedWrong.length < TARGET_WRONG) {
      const remain = supplement.slice(pickedCorrect.length - TARGET_CORRECT >= 0 ? 0 : (TARGET_CORRECT - pickedCorrect.length));
      pickedWrong = [...pickedWrong, ...remain.slice(0, TARGET_WRONG - pickedWrong.length)];
    }
  }

  // 混ぜて順序ランダム化
  const finalList = [...pickedCorrect, ...pickedWrong]
    .map(x => ({ ...x, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ id, body_md, choices, section, sub_topic }) => ({ id, body_md, choices, section, sub_topic }));

  return finalList;
}
