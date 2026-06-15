// /mastery — 分析(2026-06-09 本格実装)
// 構成:
//   1. 今日の出題戦略(フェーズ判定 + 出題比率バー)
//   2. 教科別マスタリー(全教科の正答率 + 判定 + バー)
//   3. 小単元別ヒートマップ(弱い順 20件)
//   4. 復習タイミング(SRS・直近 10件)
//   5. ティラノ先生からのアドバイス
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import {
  Award, BarChart3, Brain, ChevronRight, Clock, RotateCw, Sparkles,
  Target, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { generateMasteryCoachComment } from '@/lib/coach';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ====================== 型 ======================
type SectionStats = { section: string; total: number; correct: number };
type SubTopicStats = { section: string; sub_topic: string; total: number; correct: number };
type SrsRow = {
  question_id: string;
  section: string;
  sub_topic: string;
  body_md: string;
  correct_streak: number;
  next_review_at: string;
  hours_until_review: number;
};
type Strategy = {
  daysLeft: number | null;
  phaseKey: 'foundation' | 'weakness' | 'final' | 'post' | 'unset';
  phaseLabel: string;
  weights: { review: number; srs: number; adaptive: number };
};

// ====================== ユーティリティ ======================
function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function gradeFromPct(p: number): { grade: string; color: string } {
  if (p >= 90) return { grade: 'S', color: 'text-amber-300' };
  if (p >= 80) return { grade: 'A', color: 'text-emerald-400' };
  if (p >= 70) return { grade: 'B', color: 'text-jigen-gold' };
  if (p >= 60) return { grade: 'C', color: 'text-amber-500' };
  if (p >= 50) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'E', color: 'text-jigen-warning' };
}
function masteryColor(p: number): string {
  if (p >= 80) return 'bg-emerald-500';
  if (p >= 60) return 'bg-jigen-gold';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-jigen-warning';
}
function fmtReview(hours: number): { label: string; tone: 'now' | 'soon' | 'later' } {
  if (hours <= 0) return { label: '今すぐ', tone: 'now' };
  if (hours < 24) return { label: `${Math.ceil(hours)}時間後`, tone: 'soon' };
  const days = Math.ceil(hours / 24);
  return { label: `${days}日後`, tone: 'later' };
}
function phaseFromDays(daysLeft: number | null): Strategy {
  if (daysLeft == null)
    return { daysLeft, phaseKey: 'unset', phaseLabel: '基礎フェーズ', weights: { review: 0.35, srs: 0.15, adaptive: 0.50 } };
  if (daysLeft < 0)
    return { daysLeft, phaseKey: 'post', phaseLabel: '試験後・復習フェーズ', weights: { review: 0.40, srs: 0.30, adaptive: 0.30 } };
  if (daysLeft <= 30)
    return { daysLeft, phaseKey: 'final', phaseLabel: '直前フェーズ', weights: { review: 0.50, srs: 0.30, adaptive: 0.20 } };
  if (daysLeft <= 90)
    return { daysLeft, phaseKey: 'weakness', phaseLabel: '弱点強化フェーズ', weights: { review: 0.30, srs: 0.25, adaptive: 0.45 } };
  return { daysLeft, phaseKey: 'foundation', phaseLabel: '基礎フェーズ', weights: { review: 0.35, srs: 0.15, adaptive: 0.50 } };
}

// ====================== SQL ======================
async function getDaysLeft(userId: string): Promise<number | null> {
  try {
    const r = await db.execute(sql`
      select (target_exam_date - current_date)::int as d
      from users where id = ${userId} and target_exam_date is not null
    `);
    const rows = (r as unknown as { rows?: { d: number }[] }).rows ?? (r as unknown as { d: number }[]);
    return rows?.[0]?.d ?? null;
  } catch { return null; }
}

async function getSections(userId: string): Promise<SectionStats[]> {
  try {
    const r = await db.execute(sql`
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
    const rows = (r as unknown as { rows?: SectionStats[] }).rows ?? (r as unknown as SectionStats[]);
    return rows ?? [];
  } catch { return []; }
}

async function getSubTopics(userId: string): Promise<SubTopicStats[]> {
  try {
    const r = await db.execute(sql`
      select q.section, q.sub_topic,
             count(*)::int as total,
             count(*) filter (where a.is_correct = true)::int as correct
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId}
      group by q.section, q.sub_topic
      having count(*) >= 3
      order by (count(*) filter (where a.is_correct = true)::float / nullif(count(*)::float, 0)) asc nulls first,
               count(*) desc
      limit 20
    `);
    const rows = (r as unknown as { rows?: SubTopicStats[] }).rows ?? (r as unknown as SubTopicStats[]);
    return rows ?? [];
  } catch { return []; }
}

async function getSrsUpcoming(userId: string): Promise<SrsRow[]> {
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
      ),
      due as (
        select st.question_id, st.correct_streak,
               st.last_attempt +
                 case st.correct_streak
                   when 1 then interval '1 day'
                   when 2 then interval '3 days'
                   when 3 then interval '7 days'
                   when 4 then interval '14 days'
                   when 5 then interval '30 days'
                   else interval '60 days'
                 end as next_review_at
        from streak st
        where st.correct_streak >= 1
      )
      select q.id::text as question_id, q.section, q.sub_topic, q.body_md,
             d.correct_streak,
             to_char(d.next_review_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as next_review_at,
             extract(epoch from (d.next_review_at - now())) / 3600.0 as hours_until_review
      from due d
      join questions q on q.id = d.question_id
      where q.published = true
      order by d.next_review_at asc
      limit 10
    `);
    const rows = (r as unknown as { rows?: SrsRow[] }).rows ?? (r as unknown as SrsRow[]);
    return rows ?? [];
  } catch { return []; }
}

// ====================== ページ ======================
export default async function MasteryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [daysLeft, sections, subTopics, srs] = await Promise.all([
    getDaysLeft(user.id),
    getSections(user.id),
    getSubTopics(user.id),
    getSrsUpcoming(user.id),
  ]);

  const strategy = phaseFromDays(daysLeft);
  const totalAttempts = sections.reduce((s, x) => s + x.total, 0);
  const totalCorrect = sections.reduce((s, x) => s + x.correct, 0);
  const overallPct = pct(totalCorrect, totalAttempts);
  const overallGrade = gradeFromPct(overallPct);

  // 一番苦手な教科(5問以上挑戦してる中で)
  const weakestSection = sections
    .filter(s => s.total >= 5)
    .map(s => ({ section: s.section, pct: pct(s.correct, s.total) }))
    .sort((a, b) => a.pct - b.pct)[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-6 border-b border-jigen-gold/30 pb-4">
        <h1 className="text-3xl font-black tracking-wider bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.5)]">
          分析
        </h1>
        <p className="mt-2 text-sm font-bold text-white/95">
          あなたの現在地と、 次に厚めに組むところ。
        </p>
      </div>

      {/* 1. 今日の出題戦略 */}
      <section className="mb-6 rounded-2xl border border-jigen-gold/40 bg-panel-gradient p-5 shadow-panel">
        <div className="mb-3 flex items-start gap-3">
          <TiranoSensei size="sm" glow />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-jigen-gold">
              今日の出題戦略
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
        <div className="mb-2">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">出題比率</p>
          <div className="flex h-4 overflow-hidden rounded-full border border-jigen-border-soft">
            <div className="bg-jigen-warning/80" style={{ width: `${strategy.weights.review * 100}%` }} title={`復習 ${Math.round(strategy.weights.review * 100)}%`} />
            <div className="bg-emerald-500/70" style={{ width: `${strategy.weights.srs * 100}%` }} title={`忘却曲線 ${Math.round(strategy.weights.srs * 100)}%`} />
            <div className="bg-gold-gradient" style={{ width: `${strategy.weights.adaptive * 100}%` }} title={`弱点+ZPD ${Math.round(strategy.weights.adaptive * 100)}%`} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-jigen-ink-soft">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-jigen-warning/80" />
              復習 {Math.round(strategy.weights.review * 100)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
              忘却曲線 {Math.round(strategy.weights.srs * 100)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-jigen-gold" />
              弱点+ZPD {Math.round(strategy.weights.adaptive * 100)}%
            </span>
          </div>
        </div>
      </section>

      {/* 2. 全体判定 */}
      <section className="mb-6 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Award className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">総合判定</p>
          <p className={`mt-0.5 text-3xl font-extrabold ${overallGrade.color}`}>{overallGrade.grade}</p>
        </div>
        <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-3 text-center">
          <Target className="mx-auto h-4 w-4 text-jigen-gold" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">累計正答率</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-jigen-gold">{overallPct}%</p>
          <p className="text-[10px] text-jigen-ink-mute">{totalAttempts}問</p>
        </div>
        <div className="rounded-xl border border-jigen-warning/30 bg-jigen-bg-panel p-3 text-center">
          <TrendingDown className="mx-auto h-4 w-4 text-jigen-warning" />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-mute">最弱教科</p>
          {weakestSection ? (
            <>
              <p className="mt-0.5 truncate text-sm font-bold text-jigen-warning">{weakestSection.section}</p>
              <p className="text-[10px] tabular-nums text-jigen-ink-soft">{weakestSection.pct}%</p>
            </>
          ) : (
            <p className="mt-2 text-[11px] text-jigen-ink-mute">蓄積中</p>
          )}
        </div>
      </section>

      {/* 3. 教科別マスタリー */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <BarChart3 className="h-4 w-4" />教科別マスタリー
        </h2>
        {sections.length === 0 ? (
          <p className="py-4 text-center text-xs text-jigen-ink-mute">問題を解くとここに集計されます。</p>
        ) : (
          <ul className="space-y-3">
            {sections.map((s) => {
              const p = pct(s.correct, s.total);
              const g = gradeFromPct(p);
              return (
                <li key={s.section}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-jigen-ink">{s.section}</span>
                    <div className="flex items-baseline gap-3 text-xs">
                      <span className="tabular-nums text-jigen-ink-soft">{s.correct}/{s.total}問</span>
                      <span className="tabular-nums font-bold text-jigen-gold-bright">{p}%</span>
                      <span className={`text-xl font-extrabold ${g.color}`}>{g.grade}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-jigen-bg-panel-2">
                    <div className={`h-full rounded-full ${masteryColor(p)} transition-[width] duration-700`} style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 4. 小単元別ヒートマップ(弱い順) */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <TrendingDown className="h-4 w-4" />小単元別の伸びしろ(弱い順 20件)
        </h2>
        {subTopics.length === 0 ? (
          <p className="py-4 text-center text-xs text-jigen-ink-mute">
            3問以上挑戦した単元から集計されます。
          </p>
        ) : (
          <ul className="space-y-2">
            {subTopics.map((s) => {
              const p = pct(s.correct, s.total);
              return (
                <li key={`${s.section}-${s.sub_topic}`} className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-widest text-jigen-gold">{s.section}</span>
                      <p className="truncate text-sm font-semibold text-jigen-ink">{s.sub_topic}</p>
                    </div>
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-jigen-ink-soft">{s.correct}/{s.total}</span>
                      <span className={p < 50 ? 'text-base font-bold text-jigen-warning' : 'text-base font-bold text-jigen-gold'}>
                        {p}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-jigen-bg-panel-2">
                    <div className={`h-full rounded-full ${masteryColor(p)}`} style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 5. 復習タイミング(SRS) */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <RotateCw className="h-4 w-4" />忘却防止タイマー(直近の復習)
        </h2>
        {srs.length === 0 ? (
          <p className="py-4 text-center text-xs text-jigen-ink-mute">
            正解した問題が一定数たまると、 忘却曲線で復習タイミングをお知らせします。
          </p>
        ) : (
          <ul className="space-y-2">
            {srs.map((r) => {
              const t = fmtReview(r.hours_until_review);
              const body = (r.body_md || '').replace(/[#*`>\-]/g, '').replace(/\s+/g, ' ').slice(0, 50).trim();
              return (
                <li key={r.question_id} className="flex items-start gap-3 rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-3">
                  <span className={
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
                    (t.tone === 'now' ? 'bg-jigen-warning/20 text-jigen-warning' :
                     t.tone === 'soon' ? 'bg-jigen-gold/15 text-jigen-gold' :
                     'bg-emerald-500/15 text-emerald-400')
                  }>
                    <Clock aria-hidden className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-jigen-gold">{r.section}</span>
                      <span className="text-[10px] text-jigen-ink-mute">/{r.sub_topic}</span>
                      <span className="ml-auto rounded-full bg-jigen-bg-panel-2 px-2 py-0.5 text-[10px] font-bold text-jigen-ink-soft">
                        連続正解{r.correct_streak}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-jigen-ink-soft">{body}...</p>
                    <p className={
                      'mt-1 text-[11px] font-bold ' +
                      (t.tone === 'now' ? 'text-jigen-warning' :
                       t.tone === 'soon' ? 'text-jigen-gold' :
                       'text-emerald-400')
                    }>
                      次の復習: {t.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 6. ティラノ先生コメント(寄り添うトーン・実データ反映) */}
      <section className="mb-6 rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <TiranoSensei size="md" glow />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-jigen-gold">
              ティラノ先生の分析
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-jigen-ink">
              {generateMasteryCoachComment({
                totalAttempts,
                totalCorrect,
                todaySolved: 0,
                todayTarget: 0,
                streakDays: 0,
                daysToExam: strategy.daysLeft,
                srsDueCount: 0,
                weakestSection: weakestSection ?? null,
                displayName: '',
                phase: strategy.phaseLabel,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* アクション */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Link
          href="/review"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink hover:border-jigen-gold hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
        >
          <Sparkles className="h-4 w-4" />学習履歴を見る
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
