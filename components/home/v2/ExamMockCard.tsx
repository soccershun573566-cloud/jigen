import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import type { ExamMockBlock } from '@/lib/mock/dashboard-data';

type Props = {
  examMock: ExamMockBlock;
};

/**
 * 「月末模試期間中!」カード。期間中のみ呼び出し側で active 判定して表示する想定。
 * 赤帯CTA + AM/PMの円形達成率。
 */
export function ExamMockCard({ examMock }: Props) {
  return (
    <section
      aria-label="月末模試"
      className="overflow-hidden rounded-2xl border border-jigen-warning/40 bg-jigen-bg-panel shadow-panel"
    >
      {/* 赤帯ヘッダ */}
      <div className="flex items-center justify-between gap-3 bg-warning-gradient px-5 py-3">
        <div className="flex items-center gap-2 text-white">
          <Flame aria-hidden className="h-5 w-5" />
          <h2 className="text-base font-bold tracking-tight">月末模試期間中!</h2>
        </div>
        <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white">
          {examMock.periodLabel}
        </span>
      </div>

      {/* 本体: CTA + AM/PM 円形 */}
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-jigen-ink-soft">
            本番想定の模試で、現在の実力を測ります。
          </p>
          <Link
            href="/practice"
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-warning-gradient px-5 text-sm font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jigen-warning focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-panel sm:w-auto"
          >
            模試をスタート
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center justify-around gap-4 sm:gap-6">
          <CircularProgress value={examMock.amProgress} label="AM" size={84} />
          <CircularProgress value={examMock.pmProgress} label="PM" size={84} />
        </div>
      </div>
    </section>
  );
}
