'use client';

// S06 演習Runner(2026-05-31 ナギ刷新)
// - 選択肢タップ → POST /api/attempts → 即時UIで正誤
// - 正解: ゴールドのglow + ティラノ先生「やったね」コメント
// - 不正解: 赤アクセント + ティラノ先生「次がんばろう」コメント
// - 「解説を見る」expand(同一画面、独立画面に飛ばない)
// - 「次の問題へ」: /practice/random に戻ってまた新しい問題を引く
// - ダーク+ゴールド基調
// - a11y: aria-live, aria-label, focus ring

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Home, Shuffle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InterruptDialog } from '@/components/practice/InterruptDialog';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { cn } from '@/lib/utils';
import type { AttemptSubmitResponse } from '@/types/api';

export type RunnerQuestion = {
  id: string;
  year: number;
  qNumber: number;
  section: string;
  subTopic: string;
  bodyMd: string;
  choices: string[]; // 選択問題のラベル一覧(数値問題は空配列)
  isNumeric: boolean;
};

type Phase = 'answering' | 'submitting' | 'judged' | 'error';

const ENCOURAGE_CORRECT = [
  'やったね、その判断はピシャリでした。',
  'いまの読み筋、確かでした。',
  '丁寧に見れていますね。',
];

const ENCOURAGE_MISS = [
  '次でいきましょう。考え方は近いです。',
  'ここは整理しがいのある一問でした。',
  '惜しい、感覚は合っています。',
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function PracticeRunner({ question }: { question: RunnerQuestion }) {
  const router = useRouter();

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [result, setResult] = useState<AttemptSubmitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [startedAt] = useState<number>(() => Date.now());

  const encourageText = useMemo(() => {
    if (!result) return '';
    return result.isCorrect
      ? pickRandom(ENCOURAGE_CORRECT)
      : pickRandom(ENCOURAGE_MISS);
  }, [result]);

  // 採点後は解説を最初は閉じておく(誤答時のみ自動open)
  useEffect(() => {
    if (result && !result.isCorrect) setExplanationOpen(true);
  }, [result]);

  async function submitAnswer(idx: number) {
    if (phase !== 'answering') return;
    setSelectedIdx(idx);
    setPhase('submitting');

    // DB の questions.answer は「正答番号(1始まり)」で格納。
    // クライアントは選択肢テキストではなく「番号(1始まり)」を送る。
    const userAnswer = { value: idx + 1 };
    const responseSeconds = Math.max(
      0,
      Math.round((Date.now() - startedAt) / 1000),
    );

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionId: question.id,
          userAnswer,
          responseSeconds,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as AttemptSubmitResponse;
      setResult(data);
      setPhase('judged');
    } catch (e) {
      setErrorMessage((e as Error).message || '送信に失敗しました');
      setPhase('error');
    }
  }

  function handleNext() {
    router.push('/practice/random');
  }

  // 正解選択肢のラベル(API レスポンスから推定)
  const correctLabel: string | null = useMemo(() => {
    if (!result) return null;
    const a = result.correctAnswer as unknown;
    if (typeof a === 'string') return a;
    if (a && typeof a === 'object' && 'value' in (a as Record<string, unknown>)) {
      const v = (a as { value: unknown }).value;
      return typeof v === 'string' ? v : String(v);
    }
    return null;
  }, [result]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 text-jigen-ink">
      {/* 上部: 中断 / 教科ラベル */}
      <div className="flex items-center justify-between">
        <InterruptDialog />
        <span className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
          {question.section} / {question.subTopic}
        </span>
      </div>

      {/* 問題本文 */}
      <article
        aria-label="問題"
        className={cn(
          'rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel',
          phase === 'judged' && result?.isCorrect && 'ring-1 ring-jigen-gold/60',
          phase === 'judged' && result && !result.isCorrect && 'ring-1 ring-jigen-warning/50',
        )}
      >
        <p className="text-[11px] uppercase tracking-widest text-jigen-ink-mute">
          {question.year}年 第{question.qNumber}問
        </p>
        <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-jigen-ink">
          {question.bodyMd}
        </div>
      </article>

      {/* 選択肢 */}
      <ul className="flex flex-col gap-3" aria-label="選択肢">
        {question.choices.map((label, i) => {
          const isPicked = selectedIdx === i;
          const isCorrectOne =
            phase === 'judged' && correctLabel !== null && label === correctLabel;
          const isWrongPicked =
            phase === 'judged' && isPicked && result && !result.isCorrect;
          const disabled = phase !== 'answering';
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => submitAnswer(i)}
                disabled={disabled}
                aria-label={`選択肢 ${String.fromCharCode(65 + i)}: ${label}`}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border bg-jigen-bg-panel p-3 text-left text-[15px] leading-relaxed min-h-[48px]',
                  'border-jigen-border-soft transition-colors',
                  'hover:border-jigen-gold/50 hover:bg-jigen-bg-panel-2',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark',
                  'disabled:cursor-default disabled:hover:border-jigen-border-soft disabled:hover:bg-jigen-bg-panel',
                  isPicked && phase === 'submitting' && 'border-jigen-gold/60 bg-jigen-bg-panel-2',
                  isCorrectOne && 'border-jigen-gold bg-jigen-bg-panel-2 text-jigen-gold shadow-gold-glow',
                  isWrongPicked && 'border-jigen-warning bg-jigen-warning-soft/30 text-jigen-ink',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                    'border-jigen-border-soft text-jigen-ink-soft',
                    isCorrectOne && 'border-jigen-gold bg-jigen-gold text-jigen-bg-dark',
                    isWrongPicked && 'border-jigen-warning bg-jigen-warning text-jigen-ink',
                  )}
                >
                  {isCorrectOne ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isWrongPicked ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="flex-1">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* エラー */}
      {phase === 'error' ? (
        <section
          aria-live="assertive"
          className="rounded-xl border border-jigen-warning/40 bg-jigen-warning-soft/20 p-4 text-sm text-jigen-ink"
        >
          <p className="font-semibold text-jigen-warning">送信に失敗しました</p>
          <p className="mt-1 text-xs text-jigen-ink-mute">{errorMessage}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPhase('answering');
                setSelectedIdx(null);
              }}
            >
              もう一度選びなおす
            </Button>
          </div>
        </section>
      ) : null}

      {/* 採点後パネル */}
      {phase === 'judged' && result ? (
        <section
          aria-live="polite"
          className={cn(
            'rounded-xl border p-5',
            result.isCorrect
              ? 'border-jigen-gold/50 bg-jigen-bg-panel shadow-gold-glow'
              : 'border-jigen-warning/40 bg-jigen-bg-panel',
          )}
        >
          <div className="flex items-center gap-3">
            <TiranoSensei
              size="sm"
              glow={result.isCorrect}
              label={result.isCorrect ? 'ティラノ先生(正解)' : 'ティラノ先生(次がんばろう)'}
            />
            <div className="flex-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  result.isCorrect ? 'text-jigen-gold' : 'text-jigen-warning',
                )}
              >
                {result.isCorrect ? '正解' : result.isNearMiss ? '惜しい' : '不正解'}
              </p>
              <p className="mt-0.5 text-xs text-jigen-ink-soft">{encourageText}</p>
            </div>
          </div>

          {/* 解説 expand */}
          <div className="mt-4 rounded-lg border border-jigen-border-soft bg-jigen-bg-panel-2">
            <button
              type="button"
              onClick={() => setExplanationOpen((v) => !v)}
              aria-expanded={explanationOpen}
              aria-controls="practice-explanation"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-jigen-ink hover:text-jigen-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark"
            >
              <span>解説を{explanationOpen ? '閉じる' : '見る'}</span>
              {explanationOpen ? (
                <ChevronUp aria-hidden className="h-4 w-4 text-jigen-gold" />
              ) : (
                <ChevronDown aria-hidden className="h-4 w-4 text-jigen-gold" />
              )}
            </button>
            {explanationOpen ? (
              <div
                id="practice-explanation"
                className="border-t border-jigen-border-soft px-4 py-3 text-[14px] leading-relaxed text-jigen-ink-soft"
              >
                {correctLabel ? (
                  <p className="mb-2 text-xs text-jigen-ink-mute">
                    正解:{' '}
                    <span className="font-semibold text-jigen-gold">
                      {correctLabel}
                    </span>
                  </p>
                ) : null}
                <p className="whitespace-pre-line">
                  {result.explanation || result.explanationMd}
                </p>
              </div>
            ) : null}
          </div>

          {/* アクション */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="border-jigen-border-soft text-jigen-ink hover:border-jigen-gold/60 hover:bg-jigen-bg-panel-2">
              <Link href="/home">
                <Home aria-hidden className="mr-1 h-4 w-4" />
                ホームへ
              </Link>
            </Button>
            <Button
              onClick={handleNext}
              className="ml-auto bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
            >
              <Shuffle aria-hidden className="mr-1 h-4 w-4" />
              次の問題へ
            </Button>
          </div>
        </section>
      ) : null}

      {/* submitting indicator */}
      {phase === 'submitting' ? (
        <p
          className="text-center text-xs text-jigen-ink-mute"
          aria-live="polite"
        >
          採点中...
        </p>
      ) : null}
    </div>
  );
}
