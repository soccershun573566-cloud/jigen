'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, X, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { cn } from '@/lib/utils';

/**
 * 25問の節目に到達した時に表示する区切り画面ダイアログ。
 *
 * - 「お疲れさま」 のお祝いラベル + ティラノ先生コメント
 * - 直近25問の中で間違えた問題 + 解説のリスト
 * - 「復習へ」(間違いリスト画面) / 「続けて解く」 ボタン
 *
 * 親 (PracticeRunner / random page) から「節目に到達したか」 を milestone API で
 * チェックして、 該当なら data を渡してこのコンポーネントを表示する。
 */

export type MilestoneMistake = {
  questionId: string;
  section: string;
  subTopic: string;
  bodyMd: string;
  choices: string[];
  correctAnswer: number | number[] | null;
  userAnswer: unknown;
  explanationMd: string;
};

export type MilestoneData = {
  currentMilestone: number; // 1=25問達成、 2=50問、 ...
  todaySolved: number;
  questionsInWindow: number; // 通常 25
  mistakesCount: number;
  mistakes: MilestoneMistake[];
};

function formatCorrectAnswer(ans: number | number[] | null, choices: string[]): string {
  if (ans == null) return '—';
  if (Array.isArray(ans)) {
    return ans
      .map((n) => `${n}. ${choices[n - 1] ?? ''}`)
      .join(' / ');
  }
  return `${ans}. ${choices[ans - 1] ?? ''}`;
}

function formatUserAnswer(u: unknown, choices: string[]): string {
  // 配列(応用問題) or 単一値
  if (Array.isArray(u)) {
    return u
      .map((n) => `${n}. ${choices[Number(n) - 1] ?? ''}`)
      .join(' / ');
  }
  const n = Number(u);
  if (!Number.isFinite(n)) return '—';
  return `${n}. ${choices[n - 1] ?? ''}`;
}

export function MilestoneDialog({
  open,
  data,
  onClose,
  onMarkSeen,
}: {
  open: boolean;
  data: MilestoneData | null;
  /** 「続けて解く」 押下時 */
  onClose: () => void;
  /** 閉じる時(両ボタン共通)に呼ばれ、 サーバ側 mark-seen を打って状態確定 */
  onMarkSeen: (milestone: number) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleCloseInternal() {
    if (!data) return;
    setSubmitting(true);
    try { await onMarkSeen(data.currentMilestone); } catch { /* 失敗しても閉じる */ }
    setSubmitting(false);
    onClose();
  }

  async function handleGoReview() {
    if (!data) return;
    setSubmitting(true);
    try { await onMarkSeen(data.currentMilestone); } catch {}
    setSubmitting(false);
    router.push('/mistakes');
  }

  if (!data) return null;

  const total = data.currentMilestone * data.questionsInWindow;
  const correct = data.questionsInWindow - data.mistakesCount;
  const pct = Math.round((correct / data.questionsInWindow) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && handleCloseInternal()}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto border-jigen-gold bg-jigen-bg-panel text-jigen-ink sm:max-w-lg"
      >
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <TiranoSensei size="md" glow />
          </div>
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
            Milestone
          </p>
          <DialogTitle className="text-center text-xl text-jigen-ink">
            <span className="text-jigen-gold">{total}問</span> 達成、 お疲れさま!
          </DialogTitle>
        </DialogHeader>

        {/* スコアサマリ */}
        <section className="mt-2 rounded-xl border border-jigen-gold/40 bg-panel-gradient p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
            直近 {data.questionsInWindow}問の結果
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-jigen-gold">
            {correct}<span className="text-base text-jigen-ink-soft">/{data.questionsInWindow}</span>
            <span className="ml-2 text-sm text-jigen-ink-soft">({pct}%)</span>
          </p>
          <p className="mt-1 text-xs text-jigen-ink-soft">
            正解 {correct}問・間違い {data.mistakesCount}問
          </p>
        </section>

        {/* 間違い一覧 */}
        {data.mistakes.length > 0 ? (
          <section className="mt-4 space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-jigen-ink">
              <BookOpen aria-hidden className="h-4 w-4 text-jigen-gold" />
              間違えた問題の解説
            </h3>
            <ul className="space-y-3">
              {data.mistakes.map((m, i) => (
                <li
                  key={m.questionId}
                  className="rounded-lg border border-jigen-border-soft bg-jigen-bg-panel-2 p-3"
                >
                  <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
                    {i + 1}. {m.section} / {m.subTopic}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-jigen-ink">
                    {m.bodyMd.length > 80 ? `${m.bodyMd.slice(0, 80)}…` : m.bodyMd}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px]">
                    <p className="text-jigen-ink-mute">
                      あなたの解答: <span className="text-jigen-warning">{formatUserAnswer(m.userAnswer, m.choices)}</span>
                    </p>
                    <p className="text-jigen-ink-mute">
                      正解: <span className="text-emerald-400">{formatCorrectAnswer(m.correctAnswer, m.choices)}</span>
                    </p>
                  </div>
                  {m.explanationMd ? (
                    <p className="mt-2 rounded-md border border-jigen-gold/30 bg-jigen-bg-panel p-2 text-[11px] leading-relaxed text-jigen-ink-soft">
                      💡 {m.explanationMd.length > 140 ? `${m.explanationMd.slice(0, 140)}…` : m.explanationMd}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <Sparkles aria-hidden className="mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-sm font-bold text-emerald-300">
              全問正解!すごい!
            </p>
            <p className="mt-1 text-xs text-jigen-ink-soft">
              この調子で次の25問へ進みましょう。
            </p>
          </section>
        )}

        {/* アクション */}
        <div className="mt-5 flex flex-col gap-2">
          {data.mistakes.length > 0 ? (
            <Button
              onClick={handleGoReview}
              disabled={submitting}
              className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
            >
              {submitting ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" />読み込み中...</>
              ) : (
                <><BookOpen className="mr-1 h-4 w-4" />復習へ<ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={handleCloseInternal}
            disabled={submitting}
            className="border-jigen-border-soft bg-transparent text-jigen-ink hover:border-jigen-gold/60 hover:bg-jigen-bg-panel-2"
          >
            続けて解く
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
