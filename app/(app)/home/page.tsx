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
  // 新: 4本を並列(RTT 5 → RTT 1)。 さらに users 関連 2クエリを 1本に統合
  const [basic, todaySolved, initialMock, specialMock] = user
    ? await Promise.all([
        getUserBasic(user.id),
        getTodaySolved(user.id),
        getInitialMockStatus(user.id),
        getSpecialMock(user.id),
      ])
    : [
        { onboarded: true, dailyTarget: DEFAULT_TODAY_TARGET, examDate: null, daysLeft: null },
        0,
        { status: 'unstarted' as const },
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

  const data = {
    ...mock,
    examDate,
    daysLeft,
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

      {/* 次回小テスト */}
      <section
        aria-label="次回小テスト"
        className="flex items-center justify-between rounded-xl border border-jigen-border-soft bg-jigen-bg-panel px-4 py-3 shadow-panel"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jigen-bg-panel-2 text-jigen-gold">
            <Clock aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-jigen-ink-mute">
              次回小テスト
            </p>
            <p className="text-sm font-semibold text-jigen-ink">{data.nextQuiz}</p>
          </div>
        </div>
        <Link
          href="/practice"
          className="text-xs font-semibold text-jigen-gold underline-offset-4 hover:underline"
        >
          予定を見る
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
