import { Suspense } from 'react';
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
import { BottomBanners, BottomBannersSkeleton } from '@/components/home/v2/BottomBanners';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { generateHomeCoachComment } from '@/lib/coach';

// 採点後にホームに戻ったら最新の進捗を反映するため動的レンダリング
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TODAY_TARGET = 25; // フォールバック値(users.daily_target_questions が無い場合)

// 旧: getDailyTarget と isOnboarded を別クエリで2回users取得 → DB往復2回
// 新: 1本に統合 → DB往復1回(RTT 半分)+ target_exam_date + display_name も同時取得
async function getUserBasic(userId: string): Promise<{
  onboarded: boolean;
  dailyTarget: number;
  examDate: string | null;
  daysLeft: number | null;
  displayName: string;
}> {
  try {
    const r = await db.execute(sql`
      select onboarded_at, daily_target_questions, display_name, email,
             to_char(target_exam_date, 'YYYY-MM-DD') as exam_date,
             (target_exam_date - current_date)::int as days_left
      from users where id = ${userId} limit 1
    `);
    const rows = (r as unknown as { rows?: Array<{
      onboarded_at: string | null;
      daily_target_questions: number | null;
      display_name: string | null;
      email: string | null;
      exam_date: string | null;
      days_left: number | null;
    }> }).rows
      ?? (r as unknown as Array<{
        onboarded_at: string | null;
        daily_target_questions: number | null;
        display_name: string | null;
        email: string | null;
        exam_date: string | null;
        days_left: number | null;
      }>);
    const row = rows?.[0];
    const v = row?.daily_target_questions;
    const name = row?.display_name?.trim() || row?.email?.split('@')[0] || '';
    return {
      onboarded: !!row?.onboarded_at,
      dailyTarget: typeof v === 'number' && v > 0 ? v : DEFAULT_TODAY_TARGET,
      examDate: row?.exam_date ?? null,
      daysLeft: typeof row?.days_left === 'number' ? row.days_left : null,
      displayName: name,
    };
  } catch {
    return { onboarded: false, dailyTarget: DEFAULT_TODAY_TARGET, examDate: null, daysLeft: null, displayName: '' };
  }
}

// 弱点教科を1件取得(5問以上挑戦した中で最低正答率)
async function getWeakestSection(userId: string): Promise<{ section: string; pct: number } | null> {
  try {
    const r = await db.execute(sql`
      select q.section,
             (count(*) filter (where a.is_correct = true)::float / nullif(count(*)::float, 0)) as ratio
      from attempts a
      join questions q on q.id = a.question_id
      where a.user_id = ${userId}::uuid
      group by q.section
      having count(*) >= 5
      order by ratio asc nulls first
      limit 1
    `);
    const rows = (r as unknown as { rows?: Array<{ section: string; ratio: number | null }> }).rows
      ?? (r as unknown as Array<{ section: string; ratio: number | null }>);
    const row = rows?.[0];
    if (!row) return null;
    const ratio = row.ratio ?? 0;
    return { section: row.section, pct: Math.round(ratio * 100) };
  } catch {
    return null;
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

// 期間限定の特別模試 / 金曜小テスト の取得は lib/home-data.ts に移動済
// (BottomBanners 子コンポーネントが Suspense で後から取得・ストリーミング)

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

  // 【Streaming SSR】 親で取得する軽量データのみ(7本並列・RTT 1)
  // 重い特別模試/金曜小テストは BottomBanners が Suspense で後から取得
  // → ホーム上半分(試験日・今日の問題・3カラム) が先に表示、 下半分は streaming で埋まる
  const [basic, todaySolved, initialMock, overall, streak, srsDue, weakestSection] = user
    ? await Promise.all([
        getUserBasic(user.id),
        getTodaySolved(user.id),
        getInitialMockStatus(user.id),
        getOverallStats(user.id),
        getCurrentStreak(user.id),
        getSrsDueCount(user.id),
        getWeakestSection(user.id),
      ])
    : [
        { onboarded: true, dailyTarget: DEFAULT_TODAY_TARGET, examDate: null, daysLeft: null, displayName: '' },
        0,
        { status: 'unstarted' as const },
        { total_attempts: 0, total_correct: 0 },
        0,
        0,
        null,
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

  // ティラノ先生コメント(寄り添うトーン・実データ反映)
  const coach = generateHomeCoachComment({
    totalAttempts: overall.total_attempts,
    totalCorrect: overall.total_correct,
    todaySolved,
    todayTarget,
    streakDays: streak,
    daysToExam: daysLeft,
    srsDueCount: srsDue,
    weakestSection,
    displayName: basic.displayName,
    currentJudgment,
  });

  const data = {
    ...mock,
    examDate,
    daysLeft,
    currentJudgment,
    currentPhase,
    streakDays: streak,
    nextQuiz,
    aiComment: coach.comment,
    warning: coach.warning,
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

      {/* 【Streaming SSR】 重いバナー(金曜小テスト + 特別模試) は Suspense で後から */}
      {user ? (
        <Suspense fallback={<BottomBannersSkeleton />}>
          <BottomBanners userId={user.id} />
        </Suspense>
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
