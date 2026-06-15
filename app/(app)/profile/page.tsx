// プロフィール画面(添付画像参考のリッチ版)
// - ユーザー(アバター + ニックネーム編集 + 現在の判定)+ 試験日カード
// - サマリ4枚(総問題数 / 総正答率 / 継続日数 / 間違えリスト)
// - 教科別の達成率と判定
// - 成長の推移(直近5週)
// - ティラノ先生コメント
// - 現在の学習フェーズ(タイムライン)
// - 次回の小テスト(モック)
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import {
  Award,
  Target,
  Flame,
  ChevronRight,
  Calendar,
  Mountain,
  Sparkles,
  Brain,
  RotateCw,
  Zap,
  TrendingDown,
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { NicknameEditor } from '@/components/profile/NicknameEditor';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { PreferencesEditor } from '@/components/profile/PreferencesEditor';
import { generateProfileCoachComment } from '@/lib/coach';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OverallStats = {
  total_attempts: number;
  total_correct: number;
  study_days: number;
};
type SectionStats = {
  section: string;
  total: number;
  correct: number;
};
type WeeklyRow = {
  week_idx: number; // 0=今週, 1=先週, 2=2週間前, ...
  total: number;
  correct: number;
};
type StreakRow = { streak: number };
type ProfileRow = { email: string; display_name: string | null; avatar_url: string | null };

// 試験日(モック・将来 users.target_exam_date から)
const EXAM_DATE = '2025-11-15';

const PHASES = [
  { key: 'foundation', label: '基礎構築期', min: 0 },
  { key: 'weak_improve', label: '苦手改善期', min: 100 },
  { key: 'stabilize', label: '得点安定期', min: 400 },
  { key: 'mock_focus', label: '模試強化期', min: 800 },
  { key: 'final_tune', label: '本試験調整期', min: 1200 },
] as const;

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function gradeFromPct(p: number): { grade: string; color: string } {
  if (p >= 90) return { grade: 'S', color: 'text-amber-300' };
  if (p >= 80) return { grade: 'A', color: 'text-emerald-400' };
  if (p >= 70) return { grade: 'B', color: 'text-jigen-gold' };
  if (p >= 60) return { grade: 'C', color: 'text-amber-500' };
  if (p >= 50) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'E', color: 'text-jigen-warning' };
}

function getCurrentPhase(totalAttempts: number) {
  let current = PHASES[0];
  for (const p of PHASES) {
    if (totalAttempts >= p.min) current = p;
  }
  return current;
}

function daysLeft(target: string): number {
  const t = new Date(target + 'T00:00:00+09:00').getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((t - now) / (24 * 60 * 60 * 1000)));
}

async function getProfile(userId: string): Promise<ProfileRow> {
  try {
    const result = await db.execute(sql`
      select email, display_name, avatar_url from users where id = ${userId}
    `);
    const rows = (result as unknown as { rows?: ProfileRow[] }).rows
      ?? (result as unknown as ProfileRow[]);
    return rows?.[0] ?? { email: '', display_name: null, avatar_url: null };
  } catch {
    return { email: '', display_name: null, avatar_url: null };
  }
}

async function getOverall(userId: string): Promise<OverallStats> {
  try {
    const result = await db.execute(sql`
      select count(*)::int as total_attempts,
             count(*) filter (where is_correct = true)::int as total_correct,
             count(distinct date_trunc('day', attempted_at at time zone 'Asia/Tokyo'))::int as study_days
      from attempts where user_id = ${userId}
    `);
    const rows = (result as unknown as { rows?: OverallStats[] }).rows
      ?? (result as unknown as OverallStats[]);
    return rows?.[0] ?? { total_attempts: 0, total_correct: 0, study_days: 0 };
  } catch {
    return { total_attempts: 0, total_correct: 0, study_days: 0 };
  }
}

async function getBySection(userId: string): Promise<SectionStats[]> {
  try {
    const result = await db.execute(sql`
      select q.section,
             count(*)::int as total,
             count(*) filter (where a.is_correct = true)::int as correct
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId}
      group by q.section
      order by case q.section
        when '建築学一般' then 1
        when '施工管理法' then 2
        when '法規' then 3
        else 4 end
    `);
    const rows = (result as unknown as { rows?: SectionStats[] }).rows
      ?? (result as unknown as SectionStats[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

async function getWeekly(userId: string): Promise<WeeklyRow[]> {
  try {
    // 直近5週、JST月曜起点
    const result = await db.execute(sql`
      with weeks as (
        select w as week_idx,
               (date_trunc('week', (now() at time zone 'Asia/Tokyo')) - (w || ' weeks')::interval) as wstart
        from generate_series(0, 4) as w
      )
      select w.week_idx::int as week_idx,
             count(a.*)::int as total,
             count(*) filter (where a.is_correct = true)::int as correct
      from weeks w
      left join attempts a on a.user_id = ${userId}
        and (a.attempted_at at time zone 'Asia/Tokyo') >= w.wstart
        and (a.attempted_at at time zone 'Asia/Tokyo') < (w.wstart + interval '1 week')
      group by w.week_idx
      order by w.week_idx desc
    `);
    const rows = (result as unknown as { rows?: WeeklyRow[] }).rows
      ?? (result as unknown as WeeklyRow[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

async function getCurrentStreak(userId: string): Promise<number> {
  try {
    // 連続日数: JST単位で、今日(or直近)から遡って連続して attempts のある日数
    const result = await db.execute(sql`
      with days as (
        select distinct date_trunc('day', attempted_at at time zone 'Asia/Tokyo')::date as d
        from attempts where user_id = ${userId}
      ),
      diffs as (
        select d, (d - (row_number() over (order by d desc) - 1)::int)::date as anchor
        from days
      )
      select count(*)::int as streak
      from diffs
      where anchor = (select max(anchor) from diffs)
        and (current_date at time zone 'Asia/Tokyo')::date - d <= 1
    `);
    const rows = (result as unknown as { rows?: StreakRow[] }).rows
      ?? (result as unknown as StreakRow[]);
    return rows?.[0]?.streak ?? 0;
  } catch {
    return 0;
  }
}

// ===== ジゲンAI v2: 今日の戦略 =====
type Strategy = {
  daysLeft: number | null;
  phaseKey: 'foundation' | 'weakness' | 'final' | 'post' | 'unset';
  phaseLabel: string;
  weights: { review: number; srs: number; adaptive: number };
  weakestSection: { section: string; pct: number; total: number } | null;
  reviewDueCount: number;
  srsDueCount: number;
};

function phaseFromDays(daysLeft: number | null): { key: Strategy['phaseKey']; label: string; weights: Strategy['weights'] } {
  if (daysLeft == null)
    return { key: 'unset', label: '基礎フェーズ', weights: { review: 0.35, srs: 0.15, adaptive: 0.50 } };
  if (daysLeft < 0)
    return { key: 'post', label: '試験後・復習フェーズ', weights: { review: 0.40, srs: 0.30, adaptive: 0.30 } };
  if (daysLeft <= 30)
    return { key: 'final', label: '直前フェーズ', weights: { review: 0.50, srs: 0.30, adaptive: 0.20 } };
  if (daysLeft <= 90)
    return { key: 'weakness', label: '弱点強化フェーズ', weights: { review: 0.30, srs: 0.25, adaptive: 0.45 } };
  return { key: 'foundation', label: '基礎フェーズ', weights: { review: 0.35, srs: 0.15, adaptive: 0.50 } };
}

async function getStrategy(userId: string, sections: SectionStats[]): Promise<Strategy> {
  // 【高速化】 旧: 3本のSQLを逐次 await(3 RTT)
  //          新: 3本を Promise.all で並列(1 RTT)
  const [daysLeftRaw, reviewDueRaw, srsDueRaw] = await Promise.all([
    db.execute(sql`
      select (target_exam_date - current_date)::int as d
      from users where id = ${userId} and target_exam_date is not null
    `).catch(() => null),
    db.execute(sql`
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
      select count(*)::int as c
      from ever_wrong ew
      join last_two lt on lt.question_id = ew.question_id
      where (lt.last1 is not true or lt.last2 is not true)
        and lt.last_attempt < now() - interval '2 days'
    `).catch(() => null),
    db.execute(sql`
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
    `).catch(() => null),
  ]);

  // 1. 試験日からの残り日数
  const dlRows = daysLeftRaw
    ? ((daysLeftRaw as unknown as { rows?: { d: number }[] }).rows
        ?? (daysLeftRaw as unknown as { d: number }[]))
    : [];
  const daysLeft = dlRows?.[0]?.d ?? null;

  const phase = phaseFromDays(daysLeft);

  // 2. 弱点教科(5問以上挑戦してる中で最低正答率)
  const candidates = sections
    .filter((s) => s.total >= 5)
    .map((s) => ({ section: s.section, pct: pct(s.correct, s.total), total: s.total }))
    .sort((a, b) => a.pct - b.pct);
  const weakestSection = candidates[0] ?? null;

  // 3. 復習(間違え)の件数
  const rdRows = reviewDueRaw
    ? ((reviewDueRaw as unknown as { rows?: { c: number }[] }).rows
        ?? (reviewDueRaw as unknown as { c: number }[]))
    : [];
  const reviewDueCount = rdRows?.[0]?.c ?? 0;

  // 4. SRS due 件数
  const sdRows = srsDueRaw
    ? ((srsDueRaw as unknown as { rows?: { c: number }[] }).rows
        ?? (srsDueRaw as unknown as { c: number }[]))
    : [];
  const srsDueCount = sdRows?.[0]?.c ?? 0;

  return {
    daysLeft,
    phaseKey: phase.key,
    phaseLabel: phase.label,
    weights: phase.weights,
    weakestSection,
    reviewDueCount,
    srsDueCount,
  };
}

async function getMistakesCount(userId: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      with attempt_seq as (
        select question_id, is_correct,
               row_number() over (partition by question_id order by attempted_at desc) as rn
        from attempts where user_id = ${userId}
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
        where user_id = ${userId} and is_correct = false
      )
      select count(*)::int as c
      from ever_wrong ew
      left join last_two lt on lt.question_id = ew.question_id
      where (lt.last1 is not true or lt.last2 is not true)
    `);
    const rows = (result as unknown as { rows?: { c: number }[] }).rows
      ?? (result as unknown as { c: number }[]);
    return rows?.[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [profile, overall, sections, weekly, streak, mistakesCount] = await Promise.all([
    getProfile(user.id),
    getOverall(user.id),
    getBySection(user.id),
    getWeekly(user.id),
    getCurrentStreak(user.id),
    getMistakesCount(user.id),
  ]);

  // ジゲンAI v2: 今日の戦略を計算(sections に依存するので Promise.all 後)
  const strategy = await getStrategy(user.id, sections);

  const overallPct = pct(overall.total_correct, overall.total_attempts);
  const overallGrade = gradeFromPct(overallPct);
  const phase = getCurrentPhase(overall.total_attempts);
  const dleft = daysLeft(EXAM_DATE);
  const weeklyAsc = [...weekly].reverse(); // 表示は古い→新しい

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-wide text-jigen-ink drop-shadow-[0_0_8px_rgba(245,196,65,0.25)]">
          プロフィール
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <PreferencesEditor />
          <Link
            href="/settings"
            className="rounded-md p-2 text-jigen-ink-soft hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
            aria-label="設定"
          >
            <Sparkles aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* ユーザー + 試験日 */}
      <section className="mb-4 grid gap-4 rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <AvatarEditor currentAvatarUrl={profile.avatar_url} />
        <div className="space-y-3">
          <NicknameEditor
            initialName={profile.display_name ?? ''}
            fallback={profile.email?.split('@')[0] ?? 'ユーザー'}
          />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">現在の判定</p>
            <div className="mt-1 flex items-center gap-2">
              <Award aria-hidden className="h-6 w-6 text-jigen-gold" />
              <span className={`text-3xl font-extrabold ${overallGrade.color}`}>
                {overallGrade.grade}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-dark p-3 sm:min-w-[180px]">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
            <Calendar aria-hidden className="h-3.5 w-3.5" />
            試験日
          </div>
          <p className="mt-1 text-sm font-semibold text-jigen-ink">{EXAM_DATE}</p>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-jigen-ink-mute">試験まで</div>
          <p className="text-2xl font-extrabold tabular-nums text-jigen-gold drop-shadow-[0_0_8px_rgba(245,196,65,0.4)]">
            {dleft}
            <span className="ml-1 text-xs font-medium text-jigen-ink-soft">日</span>
          </p>
        </div>
      </section>

      {/* サマリ4枚 */}
      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Target aria-hidden className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">総問題数</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums">{overall.total_attempts.toLocaleString()}</p>
          <p className="text-[10px] text-jigen-ink-mute">解いた問題</p>
        </div>
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Award aria-hidden className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">総正答率</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-jigen-gold">{overallPct}%</p>
          <p className="text-[10px] text-jigen-ink-mute">{overall.total_correct}問正解</p>
        </div>
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Flame aria-hidden className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">継続日数</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-jigen-gold">{streak}日</p>
          <p className="text-[10px] text-jigen-ink-mute">合計{overall.study_days}日学習</p>
        </div>
        <Link
          href="/mistakes"
          className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center transition-colors hover:border-jigen-gold/50 hover:bg-jigen-bg-panel-2"
        >
          <ChevronRight aria-hidden className="ml-auto h-4 w-4 text-jigen-ink-mute" />
          <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">間違えリスト</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-jigen-warning">{mistakesCount}</p>
          <p className="text-[10px] text-jigen-ink-mute">復習推奨</p>
        </Link>
      </section>

      {/* ジゲン先生からの今日の戦略 */}
      <section className="mb-4 rounded-2xl border border-jigen-gold/40 bg-panel-gradient p-4 shadow-panel">
        <div className="mb-3 flex items-start gap-3">
          <TiranoSensei size="sm" glow />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-jigen-gold">
              ジゲン先生からの今日の戦略
            </p>
            <p className="text-base font-bold text-jigen-ink">
              {strategy.phaseLabel}
              {strategy.daysLeft != null && strategy.daysLeft >= 0 && (
                <span className="ml-2 text-xs font-medium text-jigen-ink-soft">
                  (試験まで{strategy.daysLeft}日)
                </span>
              )}
              {strategy.daysLeft == null && (
                <span className="ml-2 text-xs font-medium text-jigen-ink-mute">
                  (試験日未設定)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 出題比率バー(プール構成) */}
        <div className="mb-3">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
            今日の出題構成
          </p>
          <div className="flex h-3 overflow-hidden rounded-full border border-jigen-border-soft">
            <div
              className="flex items-center justify-center bg-jigen-warning/80"
              style={{ width: `${strategy.weights.review * 100}%` }}
              title={`復習 ${Math.round(strategy.weights.review * 100)}%`}
            />
            <div
              className="flex items-center justify-center bg-emerald-500/70"
              style={{ width: `${strategy.weights.srs * 100}%` }}
              title={`SRS ${Math.round(strategy.weights.srs * 100)}%`}
            />
            <div
              className="flex items-center justify-center bg-gold-gradient"
              style={{ width: `${strategy.weights.adaptive * 100}%` }}
              title={`Adaptive ${Math.round(strategy.weights.adaptive * 100)}%`}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-jigen-ink-soft">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-jigen-warning/80" />
              復習 {Math.round(strategy.weights.review * 100)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/70" />
              忘却曲線(SRS) {Math.round(strategy.weights.srs * 100)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-jigen-gold" />
              弱点+ZPD {Math.round(strategy.weights.adaptive * 100)}%
            </span>
          </div>
        </div>

        {/* 3枚カード: 弱点 / 復習 due / SRS due */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
              <TrendingDown aria-hidden className="h-3 w-3" />
              弱点教科
            </div>
            {strategy.weakestSection ? (
              <>
                <p className="mt-0.5 truncate text-sm font-bold text-jigen-warning">
                  {strategy.weakestSection.section}
                </p>
                <p className="text-[10px] tabular-nums text-jigen-ink-soft">
                  {strategy.weakestSection.pct}%
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-xs text-jigen-ink-mute">データ蓄積中</p>
            )}
          </div>
          <div className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
              <RotateCw aria-hidden className="h-3 w-3" />
              復習対象
            </div>
            <p className="mt-0.5 text-sm font-bold text-jigen-ink">
              <span className="text-xl tabular-nums text-jigen-warning">{strategy.reviewDueCount}</span>
              <span className="ml-1 text-[10px] text-jigen-ink-soft">問</span>
            </p>
            <p className="text-[10px] text-jigen-ink-mute">2日以上前の間違え</p>
          </div>
          <div className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
              <Brain aria-hidden className="h-3 w-3" />
              忘却防止
            </div>
            <p className="mt-0.5 text-sm font-bold text-jigen-ink">
              <span className="text-xl tabular-nums text-emerald-400">{strategy.srsDueCount}</span>
              <span className="ml-1 text-[10px] text-jigen-ink-soft">問</span>
            </p>
            <p className="text-[10px] text-jigen-ink-mute">復習タイミング到来</p>
          </div>
        </div>

        {/* 戦略コメント */}
        <div className="mt-3 rounded-md border border-jigen-gold/20 bg-jigen-bg-dark/40 p-2.5">
          <div className="flex items-start gap-1.5">
            <Zap aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
            <p className="text-[11px] leading-relaxed text-jigen-ink-soft">
              {strategy.phaseKey === 'unset' &&
                `試験日を設定すると、残り日数に応じた最適な戦略をお伝えできます。今は基礎を満遍なくカバーしています。`}
              {strategy.phaseKey === 'foundation' && strategy.weakestSection &&
                `まだ試験まで余裕があるので、新規問題を中心に基礎を固めます。特に「${strategy.weakestSection.section}」の比重を上げて、苦手の芽を早めに摘んでいきましょう。`}
              {strategy.phaseKey === 'foundation' && !strategy.weakestSection &&
                `まだ試験まで余裕があるので、新規問題を中心に基礎を固めます。データが溜まると、苦手分野をピンポイントで補強できますよ。`}
              {strategy.phaseKey === 'weakness' && strategy.weakestSection &&
                `中盤戦です。「${strategy.weakestSection.section}」を中心に、弱点を一つずつ潰していきましょう。復習比率も少し上げています。`}
              {strategy.phaseKey === 'weakness' && !strategy.weakestSection &&
                `中盤戦です。弱点強化フェーズに入っています。データが溜まり次第、苦手分野を集中的にお出しします。`}
              {strategy.phaseKey === 'final' &&
                `本試験まで残りわずか。新規問題は控えめにし、これまで間違えた問題の総ざらいに集中します。総仕上げにかかりましょう。`}
              {strategy.phaseKey === 'post' &&
                `試験日を過ぎました。引き続き復習中心で力を維持しますか? 設定から試験日を更新できます。`}
            </p>
          </div>
        </div>
      </section>

      {/* 教科別の達成率と判定 */}
      <section className="mb-4 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel">
        <h2 className="mb-3 text-sm font-bold">教科別の達成率と判定</h2>
        {sections.length === 0 ? (
          <p className="text-xs text-jigen-ink-mute">まだデータがありません。問題を解いてみましょう。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sections.map((s) => {
              const p = pct(s.correct, s.total);
              const g = gradeFromPct(p);
              return (
                <li key={s.section} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                  <div className="text-sm font-semibold text-jigen-ink">{s.section}</div>
                  <div className="flex items-baseline gap-3 text-xs">
                    <span className="tabular-nums text-jigen-gold-bright">{p}%</span>
                    <span className={`text-xl font-extrabold ${g.color}`}>{g.grade}</span>
                  </div>
                  <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-jigen-bg-panel-2">
                    <div
                      className="h-full rounded-full bg-gold-gradient transition-[width] duration-700"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <div className="col-span-2 text-[10px] tabular-nums text-jigen-ink-mute">
                    {s.correct}/{s.total} 問正解
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 直近5週の推移 */}
      <section className="mb-4 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel">
        <h2 className="mb-3 text-sm font-bold">直近5週の推移</h2>
        {weeklyAsc.every((w) => w.total === 0) ? (
          <p className="text-xs text-jigen-ink-mute">まだデータがありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weeklyAsc.map((w) => {
              const labels = ['4週間前', '3週間前', '2週間前', '先週', '今週'];
              const idx = 4 - w.week_idx;
              const label = labels[idx] ?? `${w.week_idx}週前`;
              const correctPct = pct(w.correct, w.total);
              const maxTotal = Math.max(1, ...weeklyAsc.map((x) => x.total));
              const barWidth = (w.total / maxTotal) * 100;
              return (
                <li key={w.week_idx} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[11px] text-jigen-ink-mute">{label}</span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded bg-jigen-bg-panel-2">
                    <div
                      className="absolute inset-y-0 left-0 bg-gold-gradient"
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-semibold tabular-nums text-jigen-ink mix-blend-difference">
                      {w.total}問 / {correctPct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 学習フェーズ */}
      <section className="mb-4 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel">
        <h2 className="mb-3 text-sm font-bold">現在の学習フェーズ</h2>
        <ol className="mb-3 flex items-center justify-between gap-1">
          {PHASES.map((p) => {
            const reached = overall.total_attempts >= p.min;
            const current = p.key === phase.key;
            return (
              <li key={p.key} className="flex flex-1 flex-col items-center">
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold',
                    current
                      ? 'border-jigen-gold bg-jigen-gold text-jigen-bg-dark shadow-gold-glow'
                      : reached
                        ? 'border-jigen-gold/60 text-jigen-gold'
                        : 'border-jigen-border-soft text-jigen-ink-mute',
                  ].join(' ')}
                >
                  {reached ? '✓' : ' '}
                </div>
                <p
                  className={[
                    'mt-1 text-[10px] leading-tight',
                    current ? 'font-bold text-jigen-gold' : 'text-jigen-ink-mute',
                  ].join(' ')}
                >
                  {p.label}
                </p>
              </li>
            );
          })}
        </ol>
        <div className="rounded-md border border-jigen-gold/30 bg-jigen-bg-panel-2 p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-jigen-gold">
            <Mountain aria-hidden className="h-3.5 w-3.5" />
            現在地: {phase.label}
          </div>
          <p className="mt-1 text-xs text-jigen-ink-soft">
            {phase.key === 'foundation' && '基礎を一問ずつ。継続が一番の近道です。'}
            {phase.key === 'weak_improve' && '苦手分野を克服し、得点力を底上げしている時期です。'}
            {phase.key === 'stabilize' && '安定した正答率を維持するフェーズ。穴を一つずつ埋めましょう。'}
            {phase.key === 'mock_focus' && '本試験を意識した模試強化期。時間配分にも注意。'}
            {phase.key === 'final_tune' && '本試験前の最終調整期。総仕上げにかかりましょう。'}
          </p>
        </div>
      </section>

      {/* ティラノ先生コメント(寄り添うトーン・実データ反映) */}
      <section className="mb-4 rounded-xl border border-jigen-gold/30 bg-panel-gradient p-4 shadow-panel">
        <div className="flex items-start gap-3">
          <TiranoSensei size="md" glow />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-jigen-gold">
              ティラノ先生からのコメント
            </p>
            <p className="mt-1 text-sm leading-relaxed text-jigen-ink">
              {generateProfileCoachComment({
                totalAttempts: overall.total_attempts,
                totalCorrect: overall.total_correct,
                todaySolved: 0,
                todayTarget: 0,
                streakDays: streak,
                daysToExam: strategy.daysLeft,
                srsDueCount: strategy.srsDueCount,
                weakestSection: strategy.weakestSection ? { section: strategy.weakestSection.section, pct: strategy.weakestSection.pct } : null,
                displayName: profile.display_name ?? profile.email?.split('@')[0] ?? '',
                phase: phase.label,
              })}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Link
          href="/home"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink shadow-panel hover:border-jigen-gold hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
        >
          ホームに戻る
        </Link>
        <Link
          href="/practice/random"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gold-gradient px-4 text-sm font-bold text-jigen-bg-dark shadow-gold-glow hover:scale-[1.02] transition-transform"
        >
          今日の問題を解く
        </Link>
      </div>
    </main>
  );
}
