import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Brain, Check, Clock, Sparkles } from 'lucide-react';
import { sql } from 'drizzle-orm';
import { getHomeV2 } from '@/lib/mock/dashboard-data';
import { HomeShell } from '@/components/home/v2/HomeShell';
import { TodayQuestionCard } from '@/components/home/v2/TodayQuestionCard';
import { ExamMockCard } from '@/components/home/v2/ExamMockCard';
import { StatTriple } from '@/components/home/v2/StatTriple';
import { AiCommentCard } from '@/components/home/v2/AiCommentCard';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

// 採点後にホームに戻ったら最新の進捗を反映するため動的レンダリング
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TODAY_TARGET = 25; // フォールバック値(users.daily_target_questions が無い場合)

// 旧: getDailyTarget と isOnboarded を別クエリで2回users取得 → DB往復2回
// 新: 1本に統合 → DB往復1回(RTT 半分)+ target_exam_date も同時取得
async function getUserBasic(userId: string): Promise<{
  onboarded: boolean;
  dailyTarget: number;
  examDate: string | null;
  daysLeft: number | null;
}> {
  try {
    const r = await db.execute(sql`
      select onboarded_at, daily_target_questions,
             to_char(target_exam_date, 'YYYY-MM-DD') as exam_date,
             (target_exam_date - current_date)::int as days_left
      from users where id = ${userId} limit 1
    `);
    const rows = (r as unknown as { rows?: Array<{
      onboarded_at: string | null;
      daily_target_questions: number | null;
      exam_date: string | null;
      days_left: number | null;
    }> }).rows
      ?? (r as unknown as Array<{
        onboarded_at: string | null;
        daily_target_questions: number | null;
        exam_date: string | null;
        days_left: number | null;
      }>);
    const row = rows?.[0];
    const v = row?.daily_target_questions;
    return {
      onboarded: !!row?.onboarded_at,
      dailyTarget: typeof v === 'number' && v > 0 ? v : DEFAULT_TODAY_TARGET,
      examDate: row?.exam_date ?? null,
      daysLeft: typeof row?.days_left === 'number' ? row.days_left : null,
    };
  } catch {
    return { onboarded: false, dailyTarget: DEFAULT_TODAY_TARGET, examDate: null, daysLeft: null };
  }
}

// ============ 統計データ(現在判定/現在地/継続日数/次の復習)============
type OverallStats = {
  total_attempts: number;
  total_correct: number;
};
type StreakRow = { streak: number };

// 累計問題数+正答率(現在判定+現在地に使用)
async function getOverallStats(userId: string): Promise<OverallStats> {
  try {
    const r = await db.execute(sql`
      select count(*)::int as total_attempts,
             count(*) filter (where is_correct = true)::int as total_correct
      from attempts where user_id = ${userId}
    `);
    const rows = (r as unknown as { rows?: OverallStats[] }).rows
      ?? (r as unknown as OverallStats[]);
    return rows?.[0] ?? { total_attempts: 0, total_correct: 0 };
  } catch {
    return { total_attempts: 0, total_correct: 0 };
  }
}

// 継続日数(JST単位)
async function getCurrentStreak(userId: string): Promise<number> {
  try {
    const r = await db.execute(sql`
      with days as (
        select distinct (attempted_at at time zone 'Asia/Tokyo')::date as d
        from attempts where user_id = ${userId}
      ),
      diffs as (
        select d, (d - (row_number() over (order by d desc) - 1)::int)::date as anchor
        from days
      )
      select count(*)::int as streak
      from diffs
      where anchor = (select max(anchor) from diffs)
        and ((current_date at time zone 'Asia/Tokyo')::date - d) <= 1
    `);
    const rows = (r as unknown as { rows?: StreakRow[] }).rows
      ?? (r as unknown as StreakRow[]);
    return rows?.[0]?.streak ?? 0;
  } catch {
    return 0;
  }
}

// 今週の金曜小テスト状態(ホームバナー用)
type WeeklyTestStatus = {
  status: 'upcoming' | 'available' | 'in_progress' | 'completed' | 'no_data';
  daysToFriday: number;
  score?: number;
  total?: number;
};
async function getWeeklyTestStatus(userId: string): Promise<WeeklyTestStatus> {
  try {
    // 月曜の日付(JST)
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const day = jst.getUTCDay(); // 0=日,1=月,...,6=土
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(jst);
    monday.setUTCDate(jst.getUTCDate() + diff);
    const mondayStr = monday.toISOString().slice(0, 10);
    const daysToFriday = day >= 1 && day <= 4 ? (5 - day) : 0;
    const isOpen = day === 5 || day === 6 || day === 0;

    // 直近7日の attempts 数(no_data 判定用)
    // と 今週の weekly_test_attempts を 1回で並列取得
    const [recentR, weeklyR] = await Promise.all([
      db.execute(sql`
        select count(*)::int as c from attempts
        where user_id = ${userId}::uuid
          and attempted_at >= now() - interval '7 days'
      `).catch(() => null),
      db.execute(sql`
        select score, jsonb_array_length(question_ids) as total, completed_at
        from weekly_test_attempts
        where user_id = ${userId}::uuid and week_start = ${mondayStr}::date
        limit 1
      `).catch(() => null),
    ]);

    const recentRows = recentR
      ? ((recentR as unknown as { rows?: { c: number }[] }).rows ?? (recentR as unknown as { c: number }[]))
      : [];
    const recentCount = recentRows?.[0]?.c ?? 0;

    const weeklyRows = weeklyR
      ? ((weeklyR as unknown as { rows?: Array<{ score: number | null; total: number; completed_at: string | null }> }).rows
          ?? (weeklyR as unknown as Array<{ score: number | null; total: number; completed_at: string | null }>))
      : [];
    const weekly = weeklyRows?.[0];

    if (weekly?.completed_at) {
      return { status: 'completed', daysToFriday, score: weekly.score ?? 0, total: weekly.total };
    }
    if (weekly && !weekly.completed_at) {
      return { status: 'in_progress', daysToFriday };
    }
    if (!isOpen) return { status: 'upcoming', daysToFriday };
    if (recentCount === 0) return { status: 'no_data', daysToFriday };
    return { status: 'available', daysToFriday };
  } catch {
    return { status: 'upcoming', daysToFriday: 0 };
  }
}

// SRS復習タイミング到来件数(「次の復習」 表示用)
async function getSrsDueCount(userId: string): Promise<number> {
  try {
    const r = await db.execute(sql`
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
      select count(*)::int as c
      from streak
      where correct_streak >= 1
        and (now() - last_attempt) >
          case correct_streak
            when 1 then interval '1 day'
            when 2 then interval '3 days'
            when 3 then interval '7 days'
            when 4 then interval '14 days'
            when 5 then interval '30 days'
            else interval '60 days'
          end
    `);
    const rows = (r as unknown as { rows?: { c: number }[] }).rows ?? (r as unknown as { c: number }[]);
    return rows?.[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

// 累計正答率から判定 (S/A/B/C/D/E)
function judgeFromAttempts(total: number, correct: number): string {
  if (total < 10) return '—'; // データ少なすぎは表示控える
  const pct = Math.round((correct / total) * 100);
  if (pct >= 90) return 'S';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'E';
}

// 累計解答数から学習フェーズ判定
function phaseFromAttempts(total: number): string {
  if (total >= 1200) return '本試験調整期';
  if (total >= 800)  return '模試強化期';
  if (total >= 400)  return '得点安定期';
  if (total >= 100)  return '苦手改善期';
  return '基礎構築期';
}

// ヘルメット階級判定(解答数+正答率)
// 成長記録としてサイドバー下部に表示。 「見習い」 から始まり、 量と質の両方が伸びると上がる
function helmetRankFromAttempts(total: number, correct: number): string {
  if (total < 50) return '見習い';
  const pct = Math.round((correct / total) * 100);
  // ダイヤモンド: 1200問+80%以上
  if (total >= 1200 && pct >= 80) return 'ダイヤモンド';
  // プラチナ: 800問+75%以上
  if (total >= 800 && pct >= 75) return 'プラチナ';
  // ゴールド: 400問+70%以上
  if (total >= 400 && pct >= 70) return 'ゴールド';
  // シルバー: 100問+60%以上 or 400問+50%以上
  if ((total >= 100 && pct >= 60) || (total >= 400 && pct >= 50)) return 'シルバー';
  // ブロンズ: それ以外(50問以上は到達済)
  return 'ブロンズ';
}

// 1級建築施工管理技士 1次試験のデフォルト試験日(ユーザー未設定時のフォールバック)
const DEFAULT_EXAM_DATE = '2026-07-19';
function calcDaysLeft(examDate: string): number {
  const t = new Date(examDate + 'T09:30:00+09:00').getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((t - now) / (24 * 60 * 60 * 1000)));
}

// 期間限定の特別模試(初回模試以外)を1件取得
type SpecialMockRow = {
  id: string;
  title: string;
  description: string | null;
  questions_count: number;
  available_from: string | null;
  available_until: string | null;
  status: 'open' | 'upcoming' | 'closed';
  days_to_open: number;
  attempt_status: 'unstarted' | 'in_progress' | 'completed';
};
async function getSpecialMock(userId: string): Promise<SpecialMockRow | null> {
  try {
    const r = await db.execute(sql`
      with exams as (
        select id, title, description, questions_count, available_from, available_until,
               case
                 when (available_from is null or now() >= available_from)
                  and (available_until is null or now() <= available_until) then 'open'
                 when available_from is not null and now() < available_from then 'upcoming'
                 else 'closed'
               end as status,
               case when available_from is not null
                    then ceil(extract(epoch from (available_from - now())) / 86400)::int
                    else 0 end as days_to_open
        from mock_exams
        where is_active = true and id != 'initial-50'
      )
      select e.*,
             case when ma.completed_at is not null then 'completed'
                  when ma.id is not null then 'in_progress'
                  else 'unstarted' end as attempt_status
      from exams e
      left join mock_attempts ma on ma.mock_exam_id = e.id and ma.user_id = ${userId}::uuid
      where e.status in ('open', 'upcoming')
      order by case e.status when 'open' then 0 else 1 end, e.available_from nulls last
      limit 1
    `);
    const rows = (r as unknown as { rows?: SpecialMockRow[] }).rows ?? (r as unknown as SpecialMockRow[]);
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

type InitialMockStatus = 'unstarted' | 'in_progress' | 'completed';
async function getInitialMockStatus(userId: string): Promise<{ status: InitialMockStatus; score?: number; total?: number }> {
  try {
    const r = await db.execute(sql`
      select completed_at, current_question_index, score
      from mock_attempts
      where user_id = ${userId} and mock_exam_id = 'initial-50'
      limit 1
    `);
    const rows = (r as unknown as { rows?: Array<{ completed_at: string | null; current_question_index: number; score: number | null }> }).rows
      ?? (r as unknown as Array<{ completed_at: string | null; current_question_index: number; score: number | null }>);
    const row = rows?.[0];
    if (!row) return { status: 'unstarted' };
    if (row.completed_at) return { status: 'completed', score: row.score ?? undefined, total: 50 };
    return { status: 'in_progress' };
  } catch {
    return { status: 'unstarted' };
  }
}

async function getTodaySolved(userId: string): Promise<number> {
  try {
    // 今日(JST)分の attempts 数 — ただし source='daily' のみカウント
    // (間違えリストからの解答は加算しない)
    const result = await db.execute(sql`
      select count(*)::int as c
      from attempts
      where user_id = ${userId}
        and source = 'daily'
        and attempted_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo')
    `);
    const rows = (result as unknown as { rows?: { c: number }[] }).rows
      ?? (result as unknown as { c: number }[]);
    return rows && rows.length > 0 ? (rows[0]?.c ?? 0) : 0;
  } catch {
    return 0;
  }
}

// S05 ホーム v2(2026-05-30 大刷新)
// ブランド: ダーク + ゴールド + ティラノ先生 + 権威感 + 成長物語
export default async function HomePage() {
  const mock = getHomeV2();
  const user = await getCurrentUser();

  // 旧: 5本のSQLを逐次 await(RTTが5回分積み上がる)
  // 新: 8本を全並列(RTT 1)。 さらに users 関連 2クエリを 1本に統合
  const [basic, todaySolved, initialMock, specialMock, overall, streak, srsDue, weeklyTest] = user
    ? await Promise.all([
        getUserBasic(user.id),
        getTodaySolved(user.id),
        getInitialMockStatus(user.id),
        getSpecialMock(user.id),
        getOverallStats(user.id),
        getCurrentStreak(user.id),
        getSrsDueCount(user.id),
        getWeeklyTestStatus(user.id),
      ])
    : [
        { onboarded: true, dailyTarget: DEFAULT_TODAY_TARGET, examDate: null, daysLeft: null },
        0,
        { status: 'unstarted' as const },
        null,
        { total_attempts: 0, total_correct: 0 },
        0,
        0,
        { status: 'upcoming' as const, daysToFriday: 0 },
      ];

  // オンボーディング未完了なら強制リダイレクト(ログインユーザーのみ)
  if (user && !basic.onboarded) {
    redirect('/onboarding');
  }

  const todayTarget = basic.dailyTarget;
  const progressPct = todayTarget > 0 ? Math.min(100, Math.round((todaySolved / todayTarget) * 100)) : 0;

  // 試験日・残り日数: 設定値があれば優先、 なければデフォルト 2026/07/19
  const examDate = basic.examDate ?? DEFAULT_EXAM_DATE;
  const daysLeft = basic.daysLeft != null && basic.daysLeft >= 0
    ? basic.daysLeft
    : calcDaysLeft(examDate);

  // 4指標を実データで上書き(mockのフォールバック値を排除)
  const currentJudgment = judgeFromAttempts(overall.total_attempts, overall.total_correct);
  const currentPhase = phaseFromAttempts(overall.total_attempts);
  const nextQuiz = srsDue > 0
    ? `忘却防止 ${srsDue}問`
    : overall.total_attempts === 0
      ? '初回模試から'
      : '次の復習タイミング待ち';
  // 成長記録: ヘルメット階級(解答数+正答率) + 継続日数
  const helmetRank = helmetRankFromAttempts(overall.total_attempts, overall.total_correct);

  const data = {
    ...mock,
    examDate,
    daysLeft,
    currentJudgment,
    currentPhase,
    streakDays: streak,
    nextQuiz,
    growth: {
      helmetRank,
      streakDays: streak,
    },
    today: {
      ...mock.today,
      totalQuestions: todayTarget,
      solvedQuestions: todaySolved,
      progressPct,
    },
  };

  return (
    <HomeShell data={data}>
      {/* 初回模試バナー(未完了の場合のみ表示) */}
      {initialMock.status !== 'completed' ? (
        <Link
          href="/mock-exam/initial-50"
          className="group mb-3 block rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-5 shadow-gold-glow transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-jigen-bg-dark">
              <Brain aria-hidden className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-gold">
                {initialMock.status === 'in_progress' ? 'Resume Diagnosis' : 'Initial Diagnosis'}
              </p>
              <p className="text-base font-bold text-jigen-ink sm:text-lg">
                {initialMock.status === 'in_progress'
                  ? '現状把握模試の続きから'
                  : 'まず現状把握模試 (50問) を受けよう'}
              </p>
              <p className="mt-1 text-xs text-jigen-ink-soft">
                {initialMock.status === 'in_progress'
                  ? '進捗は保存されています。続きから再開できます。'
                  : '受験後、AIの出題傾向があなた専用に最適化されます。'}
              </p>
            </div>
            <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-jigen-gold transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      ) : null}

      {/* 初回模試完了済の場合は結果リンクを控えめに */}
      {initialMock.status === 'completed' && initialMock.score !== undefined ? (
        <Link
          href="/mock-exam/initial-50"
          className="mb-3 flex items-center justify-between rounded-xl border border-jigen-gold/30 bg-jigen-bg-panel/60 px-4 py-3 text-xs text-jigen-ink-soft hover:border-jigen-gold/60"
        >
          <span className="inline-flex items-center gap-2">
            <Check aria-hidden className="h-3.5 w-3.5 text-emerald-400" />
            初回模試完了 — スコア: <span className="font-bold text-jigen-gold">{initialMock.score}/{initialMock.total}問</span>
          </span>
          <span className="inline-flex items-center gap-1 text-jigen-gold">
            結果を見る <ArrowRight aria-hidden className="h-3 w-3" />
          </span>
        </Link>
      ) : null}

      {/* 今日の問題(メイン) */}
      <TodayQuestionCard today={data.today} />

      {/* 金曜小テストバナー(状態に応じて表示) */}
      {weeklyTest.status === 'completed' && weeklyTest.score !== undefined ? (
        <Link
          href="/weekly-test"
          className="mb-3 flex items-center justify-between rounded-xl border border-jigen-gold/30 bg-jigen-bg-panel/60 px-4 py-3 text-xs text-jigen-ink-soft hover:border-jigen-gold/60"
        >
          <span className="inline-flex items-center gap-2">
            <Check aria-hidden className="h-3.5 w-3.5 text-emerald-400" />
            今週の金曜小テスト 完了 — スコア: <span className="font-bold text-jigen-gold">{weeklyTest.score}/{weeklyTest.total}問</span>
          </span>
          <span className="inline-flex items-center gap-1 text-jigen-gold">
            結果を見る <ArrowRight aria-hidden className="h-3 w-3" />
          </span>
        </Link>
      ) : weeklyTest.status === 'available' || weeklyTest.status === 'in_progress' ? (
        <Link
          href="/weekly-test"
          className="group mb-3 block rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-5 shadow-gold-glow transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-jigen-bg-dark">
              <Sparkles aria-hidden className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-gold">
                Weekly Test
              </p>
              <p className="text-base font-bold text-jigen-ink sm:text-lg">
                {weeklyTest.status === 'in_progress'
                  ? '金曜小テストの続きから(25問)'
                  : '今週の金曜小テスト 開催中(25問)'}
              </p>
              <p className="mt-1 text-xs text-jigen-ink-soft">
                {weeklyTest.status === 'in_progress'
                  ? '進捗は保存されています。続きから再開できます。'
                  : '直近7日の解答から正解13問+間違え12問。 学習の定着を確認しましょう。'}
              </p>
            </div>
            <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-jigen-gold transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      ) : weeklyTest.status === 'upcoming' && weeklyTest.daysToFriday > 0 ? (
        <Link
          href="/weekly-test"
          className="mb-3 block rounded-2xl border border-jigen-gold/40 bg-jigen-bg-panel/80 p-4 transition-colors hover:border-jigen-gold"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
              <Clock aria-hidden className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-jigen-gold">次の金曜小テスト</p>
              <p className="text-sm font-bold text-jigen-ink">
                開催まで <span className="text-jigen-gold">{weeklyTest.daysToFriday}日</span>(毎週金曜0時開始)
              </p>
            </div>
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-jigen-gold" />
          </div>
        </Link>
      ) : null}

      {/* 特別模試バナー(DB連動・期間判定) */}
      {specialMock && specialMock.attempt_status !== 'completed' ? (
        specialMock.status === 'open' ? (
          <Link
            href={`/mock-exam/${specialMock.id}`}
            className="group mb-3 block overflow-hidden rounded-2xl border-2 border-jigen-warning bg-gradient-to-br from-red-900/40 via-jigen-bg-panel to-jigen-bg-panel p-5 shadow-[0_0_20px_rgba(239,68,68,0.25)] transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-jigen-warning/20 text-jigen-warning">
                <span className="text-xl">🔥</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-jigen-warning">
                  期間限定 開催中
                </p>
                <p className="text-base font-bold text-jigen-ink sm:text-lg">
                  {specialMock.title}
                </p>
                <p className="mt-1 text-xs text-jigen-ink-soft">
                  {specialMock.attempt_status === 'in_progress' ? '進捗は保存されています。続きから再開できます。' : '本番形式・50問・約60分'}
                </p>
              </div>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-jigen-warning transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ) : specialMock.status === 'upcoming' ? (
          <Link
            href="/mock-exam"
            className="mb-3 block rounded-2xl border border-jigen-warning/40 bg-jigen-bg-panel/80 p-4 transition-colors hover:border-jigen-warning"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jigen-warning/15 text-jigen-warning">
                <Clock aria-hidden className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-jigen-warning">開催予告</p>
                <p className="text-sm font-bold text-jigen-ink">
                  {specialMock.title} まで <span className="text-jigen-warning">{specialMock.days_to_open}日</span>
                </p>
              </div>
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-jigen-warning" />
            </div>
          </Link>
        ) : null
      ) : null}

      {/* 3カラム: 現在判定 / 現在地 / 継続日数 */}
      <StatTriple
        items={[
          {
            icon: 'award',
            label: '現在判定',
            value: data.currentJudgment,
            emphasis: 'gold',
          },
          {
            icon: 'mountain',
            label: '現在地',
            value: data.currentPhase,
            emphasis: 'ink',
          },
          {
            icon: 'flame',
            label: '継続日数',
            value: String(data.streakDays),
            unit: '日',
            emphasis: 'gold',
          },
        ]}
      />

      {/* 次の復習(SRS忘却曲線で到来した問題数) */}
      <section
        aria-label="次の復習"
        className="flex items-center justify-between rounded-xl border border-jigen-border-soft bg-jigen-bg-panel px-4 py-3 shadow-panel"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jigen-bg-panel-2 text-jigen-gold">
            <Clock aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-jigen-ink-mute">
              次の復習
            </p>
            <p className="text-sm font-semibold text-jigen-ink">{data.nextQuiz}</p>
          </div>
        </div>
        <Link
          href="/mastery"
          className="text-xs font-semibold text-jigen-gold underline-offset-4 hover:underline"
        >
          分析を見る
        </Link>
      </section>

      {/* AIコメント + 警告 */}
      <AiCommentCard comment={data.aiComment} warning={data.warning} />

      {/* 下部にお休み登録への小リンク(現場運用は残す) */}
      <div className="pt-2 text-center text-xs">
        <Link
          href="/settings#rest"
          className="text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
        >
          今日はお休み登録する
        </Link>
      </div>
    </HomeShell>
  );
}
