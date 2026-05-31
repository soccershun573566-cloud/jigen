// S06 演習ランディング(2026-05-31 ナギ 実データ連動刷新)
// ダーク+ゴールド基調。ティラノ先生 + 2つのCTA(今日の演習 / ランダム演習)。
// MVP: 両CTAとも /practice/random に遷移(/practice/random で GET /api/practice/next を叩いて1問引いて /practice/{id} に replace)。
import Link from 'next/link';
import { Shuffle, Sparkles } from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

export const dynamic = 'force-dynamic';

export default function PracticePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col items-center justify-center gap-8 px-5 py-10 text-jigen-ink">
      <div className="flex flex-col items-center gap-4 text-center">
        <TiranoSensei size="md" glow label="ティラノ先生" />
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
            Practice
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            一問、行きましょうか
          </h1>
          <p className="text-sm text-jigen-ink-mute">
            出題はティラノ先生が選びます
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/practice/random"
          aria-label="今日の演習を始める"
          className="group flex items-center gap-4 rounded-xl border border-jigen-gold/60 bg-gold-gradient px-5 py-4 text-jigen-bg-dark shadow-gold-glow transition hover:shadow-gold-glow-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold-bright focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-jigen-bg-dark/15">
            <Sparkles aria-hidden className="h-5 w-5" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-[11px] font-semibold uppercase tracking-widest opacity-70">
              Recommended
            </span>
            <span className="block text-base font-semibold">今日の演習</span>
          </span>
          <span aria-hidden className="text-xl transition group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>

        <Link
          href="/practice/random"
          aria-label="ランダム演習を始める"
          className="group flex items-center gap-4 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel px-5 py-4 text-jigen-ink shadow-panel transition hover:border-jigen-gold/40 hover:bg-jigen-bg-panel-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-jigen-bg-panel-2 text-jigen-gold">
            <Shuffle aria-hidden className="h-5 w-5" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-jigen-ink-mute">
              Free
            </span>
            <span className="block text-base font-semibold">ランダム演習</span>
          </span>
          <span aria-hidden className="text-xl text-jigen-gold transition group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
      </div>

      <Link
        href="/home"
        className="text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
