import { ArrowUpRight } from 'lucide-react';
import { ReviewActions } from '@/components/review/ReviewActions';
import { getReviewSummary } from '@/lib/mock/dashboard-data';

// S08 今日の振り返り
// ユウ§2-(2) 振り返り60秒 + §4.4: 数字単独より「先週比」を主役にする。
export default function ReviewPage() {
  const r = getReviewSummary();
  const deltaSign = r.accuracyDeltaPt >= 0 ? '+' : '';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">今日の振り返り</h1>
        <p className="mt-1 text-sm text-muted-foreground">お疲れさまでした。60秒で確認します。</p>
      </header>

      {/* 主役: 先週比 */}
      <section
        aria-label="先週との比較"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <p className="text-xs text-muted-foreground">先週比の正答率</p>
        <div className="mt-2 flex items-baseline gap-3">
          <p className="text-4xl font-bold tabular-nums">
            {deltaSign}
            {r.accuracyDeltaPt}
            <span className="ml-1 text-base font-normal text-muted-foreground">pt</span>
          </p>
          <ArrowUpRight aria-hidden className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          今日の正答率 {r.accuracyPct}% / 解いた問題 {r.solvedCount}問
        </p>
      </section>

      {/* 伸びた単元 */}
      <section aria-label="伸びた単元">
        <h2 className="text-sm font-semibold">伸びた単元</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {r.growingTopics.map((t) => (
            <li
              key={t.subTopic}
              className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm"
            >
              <span>{t.subTopic}</span>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                +{t.deltaPt}pt
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 明日の予告(AI 1行) */}
      <section
        aria-label="明日の予告"
        className="rounded-xl border bg-secondary/60 p-5"
      >
        <p className="text-xs text-muted-foreground">明日のタスク</p>
        <p className="mt-2 text-[15px] leading-relaxed">{r.tomorrowNote}</p>
      </section>

      <div className="pt-2">
        <ReviewActions nextReviewQuestionId="q-mock-0001" />
      </div>
    </div>
  );
}
