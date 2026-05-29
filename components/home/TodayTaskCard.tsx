import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  remainingQuestions: number;
  estimatedMinutes: number;
  firstQuestionId: string;
};

// S05 中央 1/2 の主役。装飾を抑え、CTA を最大サイズで下部に置く(ユウ§8.2)。
export function TodayTaskCard({ remainingQuestions, estimatedMinutes, firstQuestionId }: Props) {
  return (
    <section
      aria-label="今日のタスク"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        今日のタスク
      </p>
      <div className="mt-3 flex items-baseline gap-4">
        <p className="text-4xl font-bold tabular-nums">{remainingQuestions}</p>
        <p className="text-base text-muted-foreground">問</p>
        <p className="ml-auto text-sm text-muted-foreground">約 {estimatedMinutes} 分</p>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        途中で閉じても、続きから再開できます。
      </p>
      <Button asChild size="lg" className="mt-6 h-14 w-full text-base">
        <Link href={`/practice/${firstQuestionId}`}>
          今日のタスクを始める
          <ArrowRight aria-hidden className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </section>
  );
}
