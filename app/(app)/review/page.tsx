// /review — 学習履歴(2026-06-09 本格実装)
// 構成:
//   1. 累計サマリ4枚(解いた問題数 / 累計正答率 / 学習日数 / 経過日数)
//   2. ヒートマップ(直近28日カレンダー)
//   3. 直近14日の推移グラフ(問題数 + 正答率)
//   4. 最近の解答履歴(20件)
//   5. 模試の受験履歴
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import {
  Award, BarChart3, Brain, Calendar, Check, ChevronRight, Clock,
  Flame, Sparkles, Target, TrendingUp, X,
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ====================== 型 ======================
type Overall = {
  total_attempts: number;
  total_correct: number;
  study_days: number;
  first_at: string | null;
};
type DailyRow = { day: string; total: number; correct: number };
type RecentRow = {
  id: string;
  section: string;
  sub_topic: string;
  body_md: string;
  is_correct: boolean;
  attempted_at: string;
  source: string;
};
type MockHistoryRow = {
  mock_exam_id: string;
  title: string;
  score: number | null;
  questions_count: number;
  completed_at: string | null;
  started_at: string;
};

// ====================== ユーティリティ ======================
function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function dayDiff(fromIso: string): number {
  const t = new Date(fromIso).getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
}
function fmtJa(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  } catch { return iso; }
}
function fmtAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}日前`;
  return fmtJa(iso);
}
function sourceLabel(s: string): { label: string; tone: 'gold' | 'red' | 'mute' } {
  if (s === 'daily') return { label: '今日の問題', tone: 'gold' };
  if (s === 'mistakes') return { label: '復習', tone: 'red' };
  if (s.startsWith('mock_')) return { label: '模試', tone: 'mute' };
  return { label: s, tone: 'mute' };
}

// ====================== SQL ======================
async function getOverall(userId: string): Promise<Overall> {
  try {
    const r = await db.execute(sql`
      select count(*)::int as total_attempts,
             count(*) filter (where is_correct = true)::int as total_correct,
             count(distinct (attempted_at at time zone 'Asia/Tokyo')::date)::int as study_days,
             to_char(min(attempted_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first_at
      from attempts where user_id = ${userId}
    `);
    const rows = (r as unknown as { rows?: Overall[] }).rows ?? (r as unknown as Overall[]);
    return rows?.[0] ?? { total_attempts: 0, total_correct: 0, study_days: 0, first_at: null };
  } catch {
    return { total_attempts: 0, total_correct: 0, study_days: 0, first_at: null };
  }
}

async function getDaily(userId: string, days: number): Promise<DailyRow[]> {
  try {
    const r = await db.execute(sql`
      with days as (
        select ((now() at time zone 'Asia/Tokyo')::date - (g || ' days')::interval)::date as d
        from generate_series(0, ${days - 1}) as g
      )
      select to_char(d.d, 'YYYY-MM-DD') as day,
             count(a.*)::int as total,
             count(*) filter (where a.is_correct = true)::int as correct
      from days d
      left join attempts a on a.user_id = ${userId}
        and (a.attempted_at at time zone 'Asia/Tokyo')::date = d.d
      group by d.d
      order by d.d
    `);
    const rows = (r as unknown as { rows?: DailyRow[] }).rows ?? (r as unknown as DailyRow[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

async function getRecent(userId: string): Promise<RecentRow[]> {
  try {
    const r = await db.execute(sql`
      select a.id::text as id, q.section, q.sub_topic, q.body_md,
             a.is_correct,
             to_char(a.attempted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as attempted_at,
             a.source
      from attempts a
      join questions q on q.id = a.question_id
      where a.user_id = ${userId}
      order by a.attempted_at desc
      limit 20
    `);
    const rows = (r as unknown as { rows?: RecentRow[] }).rows ?? (r as unknown as RecentRow[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

async function getMockHistory(userId: string): Promise<MockHistoryRow[]> {
  try {
    const r = await db.execute(sql`
      select ma.mock_exam_id, me.title, ma.score,
             me.questions_count,
             to_char(ma.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at,
             to_char(ma.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as started_at
      from mock_attempts ma
      join mock_exams me on me.id = ma.mock_exam_id
      where ma.user_id = ${userId}
      order by ma.started_at desc
    `);
    const rows = (r as unknown as { rows?: MockHistoryRow[] }).rows ?? (r as unknown as MockHistoryRow[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

// ====================== ページ本体 ======================
export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [overall, daily28, daily14, recent, mockHistory] = await Promise.all([
    getOverall(user.id),
    getDaily(user.id, 28),
    getDaily(user.id, 14),
    getRecent(user.id),
    getMockHistory(user.id),
  ]);

  const accuracyPct = pct(overall.total_correct, overall.total_attempts);
  const journeyDays = overall.first_at ? dayDiff(overall.first_at) + 1 : 0;

  // ヒートマップ用最大問題数
  const maxDaily = Math.max(1, ...daily28.map(d => d.total));
  // 14日推移の最大値
  const max14 = Math.max(1, ...daily14.map(d => d.total));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-6 border-b border-jigen-gold/30 pb-4">
        <h1 className="text-3xl font-black tracking-wider bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.5)]">
          学習履歴
        </h1>
        <p className="mt-2 text-sm font-bold text-white/95">
          あなたの足跡。 続けるほど、 ここに積み上がっていきます。
        </p>
      </div>

      {/* 1. 累計サマリ */}
      <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard icon={<Target className="h-4 w-4" />} label="解いた問題" value={overall.total_attempts.toLocaleString()} sub="累計" />
        <SummaryCard icon={<Award className="h-4 w-4" />} label="累計正答率" value={`${accuracyPct}%`} sub={`${overall.total_correct}問正解`} gold />
        <SummaryCard icon={<Flame className="h-4 w-4" />} label="学習日数" value={`${overall.study_days}日`} sub="のべ" />
        <SummaryCard icon={<Calendar className="h-4 w-4" />} label="経過日数" value={`${journeyDays}日`} sub="ジゲン開始から" />
      </section>

      {/* 2. ヒートマップ(28日) */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <BarChart3 className="h-4 w-4" />直近28日のヒートマップ
        </h2>
        {overall.total_attempts === 0 ? (
          <p className="py-6 text-center text-xs text-jigen-ink-mute">
            まだ学習履歴がありません。 1問解いてみましょう。
          </p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {daily28.map((d) => {
                const intensity = d.total / maxDaily;
                const correctPct = pct(d.correct, d.total);
                return (
                  <div
                    key={d.day}
                    className="aspect-square rounded-md border border-jigen-border-soft/50"
                    style={{
                      background: d.total === 0
                        ? 'rgba(255,255,255,0.02)'
                        : `linear-gradient(135deg, rgba(245,196,65,${0.15 + intensity * 0.6}), rgba(245,196,65,${0.25 + intensity * 0.7}))`,
                      boxShadow: d.total >= maxDaily * 0.7 ? '0 0 6px rgba(245,196,65,0.4)' : undefined,
                    }}
                    title={`${fmtJa(d.day)} ${d.total}問 / ${correctPct}%`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-jigen-ink-mute">
              濃いほど解いた問題数が多い日。 タップで詳細(実装中)。
            </p>
          </>
        )}
      </section>

      {/* 3. 直近14日の推移グラフ */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <TrendingUp className="h-4 w-4" />直近14日の推移
        </h2>
        {overall.total_attempts === 0 ? (
          <p className="py-6 text-center text-xs text-jigen-ink-mute">データが溜まると表示されます。</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {daily14.map((d) => {
              const h = (d.total / max14) * 100;
              const ac = pct(d.correct, d.total);
              const isToday = d.day === daily14[daily14.length - 1]?.day;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${fmtJa(d.day)}: ${d.total}問 ${ac}%`}>
                  <div className="relative w-full flex-1">
                    {d.total > 0 ? (
                      <div
                        className={`absolute bottom-0 w-full rounded-t-sm ${isToday ? 'bg-gold-gradient shadow-gold-glow' : 'bg-jigen-gold/60'}`}
                        style={{ height: `${Math.max(8, h)}%` }}
                      />
                    ) : (
                      <div className="absolute bottom-0 w-full rounded-t-sm bg-jigen-bg-panel-2 opacity-50" style={{ height: '4px' }} />
                    )}
                  </div>
                  <span className="text-[8px] text-jigen-ink-mute leading-none">
                    {fmtJa(d.day).replace(/月\s*/, '/').replace('日', '')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. 模試の受験履歴 */}
      {mockHistory.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
            <Brain className="h-4 w-4" />模試の受験履歴
          </h2>
          <ul className="space-y-2">
            {mockHistory.map((m) => {
              const acc = m.score != null ? pct(m.score, m.questions_count) : null;
              return (
                <li key={`${m.mock_exam_id}-${m.started_at}`} className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-jigen-ink">{m.title}</p>
                    {m.completed_at ? (
                      <span className="rounded-full bg-jigen-gold/15 px-2 py-0.5 text-[10px] font-bold text-jigen-gold">完了</span>
                    ) : (
                      <span className="rounded-full bg-jigen-bg-panel-2 px-2 py-0.5 text-[10px] font-bold text-jigen-ink-mute">中断</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-jigen-ink-soft">
                    {m.score != null ? (
                      <span>スコア: <span className="font-bold text-jigen-gold">{m.score}/{m.questions_count}問</span>{acc != null && ` (${acc}%)`}</span>
                    ) : null}
                    <span>受験: {fmtJa(m.started_at)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 5. 最近の解答履歴 */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <Clock className="h-4 w-4" />最近の解答(20件)
        </h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-xs text-jigen-ink-mute">まだ解答がありません。</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => {
              const src = sourceLabel(r.source);
              const body = (r.body_md || '').replace(/[#*`>\-]/g, '').replace(/\s+/g, ' ').slice(0, 60).trim();
              return (
                <li key={r.id} className="flex items-start gap-3 rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-3">
                  {r.is_correct ? (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jigen-warning/20 text-jigen-warning">
                      <X aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-jigen-gold">{r.section}</span>
                      <span className={
                        'rounded-full px-1.5 py-0 text-[10px] font-semibold ' +
                        (src.tone === 'gold' ? 'bg-jigen-gold/15 text-jigen-gold' :
                         src.tone === 'red' ? 'bg-jigen-warning/15 text-jigen-warning' :
                         'bg-jigen-bg-panel-2 text-jigen-ink-mute')
                      }>{src.label}</span>
                      <span className="ml-auto text-[10px] text-jigen-ink-mute">{fmtAgo(r.attempted_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-jigen-ink-soft">{body}{body.length >= 60 ? '...' : ''}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 6. ティラノ先生コメント */}
      <section className="mb-6 rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <TiranoSensei size="md" glow />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-jigen-gold">
              ティラノ先生から
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-jigen-ink">
              {overall.total_attempts === 0
                ? 'まずは1問。 ここに足跡が積もるのが、 一番の励みになりますよ。'
                : overall.study_days >= 7
                  ? `${overall.study_days}日も続けてきましたね。 累計${overall.total_attempts}問、 正答率${accuracyPct}%。 確実に前に進んでいます。`
                  : `${overall.total_attempts}問のチャレンジ、 確認しました。 1日1問でも続ければ、 30日後には景色が変わっています。`}
            </p>
          </div>
        </div>
      </section>

      {/* アクション */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Link
          href="/mastery"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink hover:border-jigen-gold hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
        >
          <Sparkles className="h-4 w-4" />分析を見る
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href="/practice/random"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-4 text-sm font-bold text-jigen-bg-dark shadow-gold-glow hover:scale-[1.02] transition-transform"
        >
          今日の問題を解く<ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

// ====================== 部品 ======================
function SummaryCard({ icon, label, value, sub, gold }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
}) {
  return (
    <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
      <div className={`mx-auto inline-flex h-6 w-6 items-center justify-center ${gold ? 'text-jigen-gold' : 'text-jigen-ink-soft'}`}>{icon}</div>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${gold ? 'text-jigen-gold' : 'text-jigen-ink'}`}>{value}</p>
      <p className="text-[10px] text-jigen-ink-mute">{sub}</p>
    </div>
  );
}
