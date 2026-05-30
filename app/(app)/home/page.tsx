import Link from 'next/link';
import { Clock } from 'lucide-react';
import { getHomeV2 } from '@/lib/mock/dashboard-data';
import { HomeShell } from '@/components/home/v2/HomeShell';
import { TodayQuestionCard } from '@/components/home/v2/TodayQuestionCard';
import { ExamMockCard } from '@/components/home/v2/ExamMockCard';
import { StatTriple } from '@/components/home/v2/StatTriple';
import { AiCommentCard } from '@/components/home/v2/AiCommentCard';

// S05 ホーム v2(2026-05-30 大刷新)
// ブランド: ダーク + ゴールド + ティラノ先生 + 権威感 + 成長物語
// 旧 ユウ§7「励まし禁止/連続日数主役にしない」原則は CEO 指示で破棄。
export default function HomePage() {
  const data = getHomeV2();

  return (
    <HomeShell data={data}>
      {/* 今日の問題(メイン) */}
      <TodayQuestionCard today={data.today} />

      {/* 月末模試(期間中のみ) */}
      {data.examMock.active ? <ExamMockCard examMock={data.examMock} /> : null}

      {/* 3カラム: 現在判定 / 現在地 / 継続日数 */}
      <StatTriple
        items={[
          {
            icon: 'award',
            label: '現在判定',
            value: data.currentJudgment,
            emphasis: 'gold',
          },
          {
            icon: 'mountain',
            label: '現在地',
            value: data.currentPhase,
            emphasis: 'ink',
          },
          {
            icon: 'flame',
            label: '継続日数',
            value: String(data.streakDays),
            unit: '日',
            emphasis: 'gold',
          },
        ]}
      />

      {/* 次回小テスト */}
      <section
        aria-label="次回小テスト"
        className="flex items-center justify-between rounded-xl border border-jigen-border-soft bg-jigen-bg-panel px-4 py-3 shadow-panel"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jigen-bg-panel-2 text-jigen-gold">
            <Clock aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-jigen-ink-mute">
              次回小テスト
            </p>
            <p className="text-sm font-semibold text-jigen-ink">{data.nextQuiz}</p>
          </div>
        </div>
        <Link
          href="/practice"
          className="text-xs font-semibold text-jigen-gold underline-offset-4 hover:underline"
        >
          予定を見る
        </Link>
      </section>

      {/* AIコメント + 警告 */}
      <AiCommentCard comment={data.aiComment} warning={data.warning} />

      {/* 下部にお休み登録への小リンク(現場運用は残す) */}
      <div className="pt-2 text-center text-xs">
        <Link
          href="/settings#rest"
          className="text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
        >
          今日はお休み登録する
        </Link>
      </div>
    </HomeShell>
  );
}
