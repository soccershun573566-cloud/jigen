import Link from 'next/link';
import { TodayTaskCard } from '@/components/home/TodayTaskCard';
import { WeeklyMap } from '@/components/home/WeeklyMap';
import { getHomeSummary } from '@/lib/mock/dashboard-data';

// S05 ホーム
// ユウ§4.1: 累計学習日を主役、連続日数は表示しない。
// 上 1/4: サマリ / 中 1/2: 今日のタスク / 下 1/4: お休み登録・設定への小リンク
export default function HomePage() {
  const summary = getHomeSummary();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      {/* 上 1/4: サマリ */}
      <section aria-label="あなたの今週" className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-muted-foreground">累計学習日</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.totalStudyDays}
              <span className="ml-1 text-sm font-normal text-muted-foreground">日</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            今週 <span className="font-semibold text-foreground">{summary.weekStudyDays}</span> 日
          </p>
        </div>
        <div className="mt-4">
          <WeeklyMap dots={summary.weekMap} />
        </div>
        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {summary.aiNote}
        </p>
      </section>

      {/* 中 1/2: 今日のタスクカード */}
      <TodayTaskCard
        remainingQuestions={summary.remainingQuestions}
        estimatedMinutes={summary.estimatedMinutes}
        firstQuestionId={summary.firstQuestionId}
      />

      {/* 下 1/4: 安全装置(控えめ)*/}
      <section
        aria-label="今日の選択肢"
        className="flex flex-col items-center gap-3 pt-2 text-sm"
      >
        <Link
          href="/settings#rest"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          今日はお休み登録する
        </Link>
        <Link
          href="/settings"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          通知・繁忙期モードを整える
        </Link>
      </section>
    </div>
  );
}
