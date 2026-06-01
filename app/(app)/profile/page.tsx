// プロフィール画面 — 生徒の学習分析(統計)
// - 累計解答数 / 正答率 / 連続日数(累計学習日)
// - 分野別正答率(建築学一般 / 施工管理法 / 法規 / その他)
// - 直近7日の進捗
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ChevronLeft, Target, Award, Calendar } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

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
  day: string;
  total: number;
  correct: number;
};

async function getOverall(userId: string): Promise<OverallStats> {
  try {
    const result = await db.execute(sql`
      select
        count(*)::int as total_attempts,
        count(*) filter (where is_correct = true)::int as total_correct,
        count(distinct date_trunc('day', attempted_at at time zone 'Asia/Tokyo'))::int as study_days
      from attempts
      where user_id = ${userId}
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
      order by total desc
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
    const result = await db.execute(sql`
      select to_char(date_trunc('day', attempted_at at time zone 'Asia/Tokyo'), 'YYYY-MM-DD') as day,
             count(*)::int as total,
             count(*) filter (where is_correct = true)::int as correct
      from attempts
      where user_id = ${userId}
        and attempted_at >= (now() - interval '7 days')
      group by 1
      order by 1 desc
    `);
    const rows = (result as unknown as { rows?: WeeklyRow[] }).rows
      ?? (result as unknown as WeeklyRow[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  const [overall, sections, weekly] = await Promise.all([
    getOverall(user.id),
    getBySection(user.id),
    getWeekly(user.id),
  ]);
  const overallPct = pct(overall.total_correct, overall.total_attempts);
  const weeklyTotal = weekly.reduce((a, x) => a + x.total, 0);
  const maxDailyTotal = Math.max(1, ...weekly.map((w) => w.total));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5 text-jigen-ink">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/home"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-jigen-ink-soft hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
          aria-label="ホームへ戻る"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">プロフィール / 学習分析</h1>
      </div>

      {/* ユーザー */}
      <section className="mb-4 flex items-center gap-4 rounded-xl border border-jigen-gold/30 bg-panel-gradient p-4 shadow-panel">
        <TiranoSensei size="md" glow rounded />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-jigen-ink">{user.email}</p>
          <p className="mt-0.5 text-xs text-jigen-ink-soft">学習者プロフィール</p>
        </div>
      </section>

      {/* サマリ3カラム */}
      <section className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Target aria-hidden className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">累計解答</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{overall.total_attempts}</p>
        </div>
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Award aria-hidden className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">正答率</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-jigen-gold">{overallPct}%</p>
        </div>
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Calendar aria-hidden className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">学習日</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{overall.study_days}</p>
        </div>
      </section>

      {/* 分野別 */}
      <section className="mb-5 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel">
        <h2 className="mb-3 text-sm font-bold">分野別の正答率</h2>
        {sections.length === 0 ? (
          <p className="text-xs text-jigen-ink-mute">まだデータがありません。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sections.map((s) => {
              const p = pct(s.correct, s.total);
              return (
                <li key={s.section}>
                  <div className="flex items-baseline justify-between text-xs text-jigen-ink-soft">
                    <span className="font-semibold text-jigen-ink">{s.section}</span>
                    <span>
                      <span className="tabular-nums text-jigen-gold-bright">{p}%</span>
                      <span className="ml-2 tabular-nums text-jigen-ink-mute">
                        ({s.correct}/{s.total})
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-jigen-bg-panel-2">
                    <div
                      className="h-full rounded-full bg-gold-gradient"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 直近7日 */}
      <section className="mb-5 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">直近7日の進捗</h2>
          <span className="text-xs text-jigen-ink-mute">
            合計 <span className="tabular-nums text-jigen-ink">{weeklyTotal}</span> 問
          </span>
        </div>
        {weekly.length === 0 ? (
          <p className="text-xs text-jigen-ink-mute">まだデータがありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weekly.map((w) => {
              const widthPct = (w.total / maxDailyTotal) * 100;
              const correctPct = pct(w.correct, w.total);
              return (
                <li key={w.day} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[11px] tabular-nums text-jigen-ink-mute">
                    {w.day}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-jigen-bg-panel-2">
                    <div
                      className="absolute inset-y-0 left-0 bg-gold-gradient"
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-semibold tabular-nums text-jigen-bg-dark mix-blend-difference">
                      {w.total}問・{correctPct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Link
          href="/mistakes"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-jigen-border-soft bg-transparent px-4 text-sm font-semibold text-jigen-ink hover:border-jigen-gold/60 hover:bg-jigen-bg-panel-2"
        >
          間違えリストを見る
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
