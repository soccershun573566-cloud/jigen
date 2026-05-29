import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getWeeklySummary } from '@/lib/mock/dashboard-data';

// S10 週次レポート
// ユウ§4.4: 数字単独より「先週比」を主役。グラフだけでなくAI解釈を添える。
// 「弱点」NG → 「これから伸びる分野」/「伸びしろ」を使う。
export default function WeeklyPage() {
  const w = getWeeklySummary();
  const accSign = w.accuracyDeltaPt >= 0 ? '+' : '';
  const solvedDelta = w.solvedCount - w.prevSolvedCount;
  const solvedSign = solvedDelta >= 0 ? '+' : '';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">今週のまとめ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          7日間の歩みと、来週の方向性。
        </p>
      </header>

      {/* 主役: 7日間サマリ */}
      <section
        aria-label="7日間サマリ"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-muted-foreground">解いた問題</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {w.solvedCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">問</span>
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {solvedDelta >= 0 ? (
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight aria-hidden className="h-3.5 w-3.5" />
              )}
              先週 {solvedSign}
              {solvedDelta}問
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">正答率</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {w.accuracyPct}
              <span className="ml-1 text-sm font-normal text-muted-foreground">%</span>
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {w.accuracyDeltaPt >= 0 ? (
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight aria-hidden className="h-3.5 w-3.5" />
              )}
              先週比 {accSign}
              {w.accuracyDeltaPt}pt
            </p>
          </div>
        </div>
      </section>

      {/* 伸びた分野 / 伸びしろ */}
      <section aria-label="分野別の変化" className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold">伸びた分野</h2>
          <ul className="flex flex-col gap-2">
            {w.improved.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <span>{f.name}</span>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  +{f.deltaPt}pt
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">来週の重点</h2>
          <ul className="flex flex-col gap-2">
            {w.upcoming.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <span>{f.name}</span>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  まだ伸びしろ
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AIからの一言 */}
      <section
        aria-label="AIからの一言"
        className="rounded-xl border bg-secondary/60 p-5"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          観察できたこと
        </p>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">
          {w.aiNote}
        </p>
      </section>

      {/* 試験日からの逆算進捗(任意) */}
      {w.countdown.enabled && (
        <section
          aria-label="試験日からの逆算進捗"
          className="rounded-xl border bg-card p-5"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-muted-foreground">試験まで</p>
            <p className="text-xs text-muted-foreground">
              現状ペースの到達 {w.countdown.projectedReach}%
            </p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {w.countdown.daysLeft}
            <span className="ml-1 text-sm font-normal text-muted-foreground">日</span>
          </p>
          <div className="mt-3">
            <Progress value={w.countdown.projectedReach} aria-label="到達ペース" />
          </div>
        </section>
      )}

      <div className="pt-2">
        <Button asChild size="lg" className="h-14 w-full text-base">
          <Link href={w.nextWeekHref}>
            来週のタスクを確認
            <ArrowRight aria-hidden className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
