'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, BookOpen, Lightbulb, PenLine, Check, X as XIcon, ArrowRight, Loader2 } from 'lucide-react';
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
 *   - 直近25問のスコア
 *   - 各間違いについて 解説要約 + 学習ポイント を表示
 *   - 「穴埋めで定着」 展開 → 穴埋め問題 + 採点UI
 *   - 「復習へ」 → /mistakes、 「続けて解く」 → 閉じる
 *
 * 解説要約・ポイント・穴埋めは AI生成(/api/practice/question-summary)。
 * milestone API のレスポンスに既存キャッシュが入っていれば即表示、 なければ展開時に生成。
 */

export type FillInAnswer = { idx: number; answer: string; aliases: string[] };

export type MilestoneMistake = {
  questionId: string;
  section: string;
  subTopic: string;
  bodyMd: string;
  choices: string[];
  explanationMd: string;
  shortExplanation: string | null;
  keyPoint: string | null;
  fillInQuestion: string | null;
  fillInAnswers: FillInAnswer[] | null;
};

export type MilestoneData = {
  currentMilestone: number;
  todaySolved: number;
  questionsInWindow: number;
  mistakesCount: number;
  mistakes: MilestoneMistake[];
};

type Summary = {
  shortExplanation: string;
  keyPoint: string;
  fillInQuestion: string;
  fillInAnswers: FillInAnswer[];
};

/** 穴埋め問題文を「テキスト + 空欄」 のシーケンスに分解 */
function parseFillIn(text: string): Array<{ kind: 'text'; value: string } | { kind: 'blank'; idx: number }> {
  const parts: Array<{ kind: 'text'; value: string } | { kind: 'blank'; idx: number }> = [];
  const re = /\[_(\d+)_\]/g;
  let last = 0;
  for (;;) {
    const m = re.exec(text);
    if (!m) break;
    if (m.index > last) parts.push({ kind: 'text', value: text.slice(last, m.index) });
    parts.push({ kind: 'blank', idx: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

function MistakeCard({ mistake }: { mistake: MilestoneMistake }) {
  const [summary, setSummary] = useState<Summary | null>(
    mistake.shortExplanation && mistake.keyPoint && mistake.fillInQuestion && mistake.fillInAnswers
      ? {
          shortExplanation: mistake.shortExplanation,
          keyPoint: mistake.keyPoint,
          fillInQuestion: mistake.fillInQuestion,
          fillInAnswers: mistake.fillInAnswers,
        }
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, { correct: boolean; expected: string }> | null>(null);
  const [grading, setGrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function ensureSummary() {
    if (summary || loading) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/practice/question-summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId: mistake.questionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary({
        shortExplanation: data.shortExplanation,
        keyPoint: data.keyPoint,
        fillInQuestion: data.fillInQuestion,
        fillInAnswers: data.fillInAnswers,
      });
    } catch (e) {
      setErrorMsg((e as Error).message || '解説を読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }

  // 初回マウントで自動的にサマリを取得(キャッシュなしの場合)
  useEffect(() => { void ensureSummary(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function gradeFillIn() {
    if (!summary) return;
    setGrading(true);
    try {
      const answers = summary.fillInAnswers.map((a) => ({
        idx: a.idx,
        value: inputs[a.idx] ?? '',
      }));
      const res = await fetch('/api/practice/fill-in-grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId: mistake.questionId, answers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { results: Array<{ idx: number; correct: boolean; expected: string }> };
      const map: Record<number, { correct: boolean; expected: string }> = {};
      for (const r of data.results) map[r.idx] = { correct: r.correct, expected: r.expected };
      setResults(map);
    } catch (e) {
      setErrorMsg((e as Error).message || '採点に失敗しました');
    } finally {
      setGrading(false);
    }
  }

  return (
    <li className="rounded-lg border border-jigen-border-soft bg-jigen-bg-panel-2 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
        {mistake.section} / {mistake.subTopic}
      </p>

      {loading && !summary ? (
        <div className="flex items-center gap-2 text-xs text-jigen-ink-soft">
          <Loader2 className="h-3 w-3 animate-spin" />
          解説を読み込んでいます…
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="rounded-md border border-jigen-gold/30 bg-jigen-bg-panel p-2">
            <p className="flex items-start gap-1 text-[11px] leading-relaxed text-jigen-ink-soft">
              <BookOpen aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
              {summary.shortExplanation}
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
            <p className="flex items-start gap-1 text-[11px] leading-relaxed text-jigen-ink">
              <Lightbulb aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
              <span><span className="font-bold text-emerald-300">ポイント: </span>{summary.keyPoint}</span>
            </p>
          </div>

          {!fillOpen ? (
            <button
              type="button"
              onClick={() => setFillOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-jigen-gold/40 px-2 py-1 text-[11px] text-jigen-gold hover:bg-jigen-gold/10"
            >
              <PenLine className="h-3 w-3" />
              穴埋めで定着
            </button>
          ) : (
            <div className="space-y-2 rounded-md border border-jigen-gold/40 bg-jigen-bg-panel p-3">
              <p className="text-[10px] uppercase tracking-widest text-jigen-gold">穴埋め小テスト</p>
              <div className="text-[12px] leading-relaxed text-jigen-ink">
                {parseFillIn(summary.fillInQuestion).map((part, i) =>
                  part.kind === 'text' ? (
                    <span key={i}>{part.value}</span>
                  ) : (
                    <span key={i} className="mx-1 inline-block">
                      <input
                        type="text"
                        value={inputs[part.idx] ?? ''}
                        onChange={(e) => setInputs((p) => ({ ...p, [part.idx]: e.target.value }))}
                        disabled={!!results}
                        className={cn(
                          'inline-block w-24 rounded border bg-jigen-bg-panel-2 px-1.5 py-0.5 text-[12px] tabular-nums',
                          results
                            ? results[part.idx]?.correct
                              ? 'border-emerald-500/60 text-emerald-300'
                              : 'border-red-500/60 text-red-300'
                            : 'border-jigen-border-soft focus:border-jigen-gold focus:outline-none',
                        )}
                        placeholder={`①②③`[part.idx - 1] ?? '?'}
                      />
                      {results && !results[part.idx]?.correct ? (
                        <span className="ml-1 text-[10px] text-emerald-300">正: {results[part.idx]?.expected}</span>
                      ) : null}
                    </span>
                  ),
                )}
              </div>
              {!results ? (
                <Button
                  size="sm"
                  onClick={gradeFillIn}
                  disabled={grading}
                  className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
                >
                  {grading ? (<><Loader2 className="mr-1 h-3 w-3 animate-spin" />採点中</>) : '答え合わせ'}
                </Button>
              ) : (
                <p className="text-[11px] text-jigen-ink-soft">
                  {Object.values(results).filter((r) => r.correct).length}/{summary.fillInAnswers.length} 正解
                </p>
              )}
            </div>
          )}
        </>
      ) : null}

      {errorMsg ? <p className="text-[11px] text-red-400">{errorMsg}</p> : null}
    </li>
  );
}

export function MilestoneDialog({
  open,
  data,
  onClose,
  onMarkSeen,
}: {
  open: boolean;
  data: MilestoneData | null;
  onClose: () => void;
  onMarkSeen: (milestone: number) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleCloseInternal() {
    if (!data) return;
    setSubmitting(true);
    try { await onMarkSeen(data.currentMilestone); } catch {}
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

        <section className="mt-2 rounded-xl border border-jigen-gold/40 bg-panel-gradient p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
            直近 {data.questionsInWindow}問の結果
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-jigen-gold">
            {correct}<span className="text-base text-jigen-ink-soft">/{data.questionsInWindow}</span>
            <span className="ml-2 text-sm text-jigen-ink-soft">({pct}%)</span>
          </p>
        </section>

        {data.mistakes.length > 0 ? (
          <section className="mt-4 space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-jigen-ink">
              <BookOpen aria-hidden className="h-4 w-4 text-jigen-gold" />
              覚えておきたい {data.mistakes.length}問
            </h3>
            <ul className="space-y-3">
              {data.mistakes.map((m) => (
                <MistakeCard key={m.questionId} mistake={m} />
              ))}
            </ul>
          </section>
        ) : (
          <section className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <Sparkles aria-hidden className="mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-sm font-bold text-emerald-300">全問正解!すごい!</p>
            <p className="mt-1 text-xs text-jigen-ink-soft">この調子で次の25問へ進みましょう。</p>
          </section>
        )}

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
