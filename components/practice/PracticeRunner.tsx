'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InterruptDialog } from '@/components/practice/InterruptDialog';
import { cn } from '@/lib/utils';
import { getNextQuestionId, type PracticeQuestion } from '@/lib/mock/dashboard-data';

// S06 演習: 1問1画面・選択肢タップで即判定 → 短解説 → 次へ。
// 制限時間表示は MVP では出さない(ユウ§3 S06)。
export function PracticeRunner({ question }: { question: PracticeQuestion }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [judged, setJudged] = useState(false);

  const isCorrect = selectedId === question.correctChoiceId;
  const progress = Math.round(((question.indexInTask - 1) / question.totalInTask) * 100);
  const remaining = question.totalInTask - question.indexInTask + 1;

  function handleSelect(choiceId: string) {
    if (judged) return;
    setSelectedId(choiceId);
    setJudged(true);
  }

  function handleNext() {
    const nextId = getNextQuestionId(question.id);
    if (nextId) {
      router.push(`/practice/${nextId}`);
    } else {
      router.push('/review');
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-5">
      {/* 上部: 残り問題数 / 中断 / 進捗バー */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            残り <span className="font-semibold text-foreground">{remaining}</span> 問
          </p>
          <InterruptDialog />
        </div>
        <Progress value={progress} className="mt-2" aria-label="今日のタスク進捗" />
      </div>

      {/* 中央: 問題本文 */}
      <article aria-label="問題" className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-xs text-muted-foreground">
          {question.section} / {question.subTopic}
        </p>
        {/* Markdown 対応は将来。MVP は plain でも改行を保持 */}
        <div className="mt-3 whitespace-pre-line text-base leading-relaxed">{question.body}</div>
      </article>

      {/* 下部: 選択肢 */}
      <ul className="flex flex-col gap-3" aria-label="選択肢">
        {question.choices.map((c, i) => {
          const selected = selectedId === c.id;
          const correctOne = judged && c.id === question.correctChoiceId;
          const wrongPicked = judged && selected && !correctOne;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelect(c.id)}
                disabled={judged}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border bg-background p-4 text-left text-[17px] leading-relaxed min-h-[56px]',
                  'transition-colors hover:bg-secondary disabled:hover:bg-background',
                  selected && !judged && 'border-foreground',
                  correctOne && 'border-foreground bg-secondary',
                  wrongPicked && 'border-muted-foreground/40 bg-muted',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    correctOne && 'border-foreground bg-foreground text-background',
                  )}
                >
                  {correctOne ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : wrongPicked ? (
                    <Minus className="h-3.5 w-3.5" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="flex-1">{c.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 判定後の解説 + 次へ */}
      {judged && (
        <section
          aria-live="polite"
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <p className="text-sm font-semibold">
            {isCorrect ? '正解です' : 'このパターンは違いました'}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {isCorrect ? question.correctNote : question.aiMissNote}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/practice/${question.id}/explanation`}>くわしい解説を見る</Link>
            </Button>
            <Button onClick={handleNext} className="ml-auto">
              次へ
              <ArrowRight aria-hidden className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
