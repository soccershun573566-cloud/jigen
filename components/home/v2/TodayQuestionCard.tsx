import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { ResetTodayButton } from '@/components/home/v2/ResetTodayButton';
import type { HomeV2Data } from '@/lib/mock/dashboard-data';

type Props = {
  today: HomeV2Data['today'];
};

/**
 * 「今日の問題」メインカード。
 * 左: 数字・進捗バー・CTA(ゴールド) / 右: ティラノ先生(プレースホルダ)
 */
export function TodayQuestionCard({ today }: Props) {
  const { totalQuestions, solvedQuestions, progressPct, startQuestionId } = today;

  return (
    <section
      aria-label="今日の問題"
      className="relative overflow-hidden rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel sm:p-8"
    >
      {/* ゴールドのglow背景アクセント */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-jigen-gold/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* 左: 数字 + 進捗 + CTA */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-jigen-gold">
              今日の問題
            </p>
            <ResetTodayButton />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-6xl font-extrabold tabular-nums text-jigen-ink drop-shadow-[0_2px_8px_rgba(245,196,65,0.15)] sm:text-7xl">
              {totalQuestions}
            </span>
            <span className="text-2xl font-semibold text-jigen-ink-soft">問</span>
          </div>

          {/* 進捗バー */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-jigen-ink-soft">
              <span>
                <span className="font-semibold tabular-nums text-jigen-ink">
                  {solvedQuestions}
                </span>{' '}
                / {totalQuestions} 問完了
              </span>
              <span className="font-bold tabular-nums text-jigen-gold-bright">
                {progressPct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="今日の進捗"
              className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-jigen-bg-panel-2"
            >
              <div
                className="h-full rounded-full bg-gold-gradient shadow-gold-glow transition-[width] duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          {/* 今日のタスクが未生成の現状は、ランダム1問を引く /practice/random に飛ばす */}
          <Link
            href="/practice/random"
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 text-base font-bold text-slate-900 shadow-gold-glow transition-transform hover:scale-[1.01] hover:shadow-gold-glow-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold-bright focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark sm:w-auto"
          >
            今日の問題をスタート
            <ArrowRight aria-hidden className="h-5 w-5" />
          </Link>
        </div>

        {/* 右: ティラノ先生 */}
        <div className="flex shrink-0 justify-center sm:justify-end">
          <TiranoSensei size="xl" pose="main" mood="smile" glow />
        </div>
      </div>
    </section>
  );
}
