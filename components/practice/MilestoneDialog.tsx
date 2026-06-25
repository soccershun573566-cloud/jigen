'use client';

import { useEffect, useState } from 'react';
import { Sparkles, BookOpen, Lightbulb, PenLine, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
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
 *  Phase 1) サマリ表示: 全間違いの「解説要約 + 学習ポイント」 を一覧
 *  Phase 2) 復習モード: 「復習へ」 押下で 全間違いの穴埋めを 1問ずつ連続表示・採点
 *
 * 穴埋めは AI生成(/api/practice/question-summary)。 milestone API のレスポンスに
 * 既存キャッシュが入っていれば即表示、 なければ展開時に生成。
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

type Phase = 'summary' | 'review' | 'done';

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

/** サマリ取得(キャッシュ優先) */
async function fetchSummary(questionId: string): Promise<Summary | null> {
  try {
    const res = await fetch('/api/practice/question-summary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ questionId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.shortExplanation) return null;
    return {
      shortExplanation: data.shortExplanation,
      keyPoint: data.keyPoint ?? '',
      fillInQuestion: data.fillInQuestion ?? '',
      fillInAnswers: Array.isArray(data.fillInAnswers) ? data.fillInAnswers : [],
    };
  } catch { return null; }
}

/** mistake から初期サマリ(キャッシュ済) を取り出す */
function initialSummary(m: MilestoneMistake): Summary | null {
  if (m.shortExplanation && m.keyPoint && m.fillInQuestion && Array.isArray(m.fillInAnswers)) {
    return {
      shortExplanation: m.shortExplanation,
      keyPoint: m.keyPoint,
      fillInQuestion: m.fillInQuestion,
      fillInAnswers: m.fillInAnswers,
    };
  }
  return null;
}

// =================== サマリカード(Phase 1) ===================

function SummaryCard({ mistake }: { mistake: MilestoneMistake }) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary(mistake));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (summary) return;
    let cancelled = false;
    setLoading(true);
    fetchSummary(mistake.questionId).then((s) => {
      if (cancelled) return;
      setSummary(s ?? {
        shortExplanation: mistake.explanationMd?.slice(0, 100) || '解説は準備中です。',
        keyPoint: `${mistake.subTopic} の問題です。`,
        fillInQuestion: '',
        fillInAnswers: [],
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        </>
      ) : null}
    </li>
  );
}

// =================== 復習モード(Phase 2) ===================

function ReviewStep({
  mistake,
  index,
  total,
  onCorrect,
  onIncorrect,
  onNext,
}: {
  mistake: MilestoneMistake;
  index: number;
  total: number;
  onCorrect: () => void;
  onIncorrect: () => void;
  onNext: () => void;
}) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary(mistake));
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, { correct: boolean; expected: string }> | null>(null);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    if (summary) return;
    let cancelled = false;
    setLoading(true);
    fetchSummary(mistake.questionId).then((s) => {
      if (cancelled) return;
      setSummary(s);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function grade() {
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
      const data = await res.json() as { results: Array<{ idx: number; correct: boolean; expected: string }> };
      const map: Record<number, { correct: boolean; expected: string }> = {};
      for (const r of data.results) map[r.idx] = { correct: r.correct, expected: r.expected };
      setResults(map);
      const allCorrect = Object.values(map).every((r) => r.correct);
      if (allCorrect) onCorrect(); else onIncorrect();
    } catch { /* */ }
    finally { setGrading(false); }
  }

  if (loading || !summary) {
    return (
      <div className="flex items-center gap-2 text-xs text-jigen-ink-soft py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        問題を準備しています…
      </div>
    );
  }

  if (!summary.fillInQuestion || summary.fillInAnswers.length === 0) {
    // 穴埋め生成失敗 → スキップ案内
    return (
      <div className="space-y-3 py-4">
        <p className="text-center text-xs text-jigen-ink-soft">
          この問題の穴埋めは準備中です。 解説で確認してください。
        </p>
        <div className="rounded-md border border-jigen-gold/30 bg-jigen-bg-panel p-3">
          <p className="text-[12px] leading-relaxed text-jigen-ink-soft">
            {summary.shortExplanation}
          </p>
        </div>
        <Button onClick={onNext} className="w-full bg-gold-gradient text-jigen-bg-dark hover:opacity-90">
          次の問題へ <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-jigen-gold">
          復習 {index + 1} / {total}
        </p>
        <p className="text-[10px] text-jigen-ink-mute">
          {mistake.section} / {mistake.subTopic}
        </p>
      </div>

      <div className="rounded-md border border-jigen-gold/30 bg-jigen-bg-panel p-3">
        <p className="text-[11px] leading-relaxed text-jigen-ink-soft">
          <span className="font-bold text-jigen-gold">解説: </span>{summary.shortExplanation}
        </p>
      </div>

      <div className="rounded-md border border-jigen-gold/40 bg-jigen-bg-panel-2 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-jigen-gold">穴埋めで定着</p>
        <div className="text-[13px] leading-relaxed text-jigen-ink">
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
                    'inline-block w-28 rounded border bg-jigen-bg-panel px-1.5 py-0.5 text-[13px] tabular-nums',
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
      </div>

      {!results ? (
        <Button onClick={grade} disabled={grading} className="w-full bg-gold-gradient text-jigen-bg-dark hover:opacity-90">
          {grading ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" />採点中</>) : '答え合わせ'}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-xs text-jigen-ink-soft">
            {Object.values(results).filter((r) => r.correct).length}/{summary.fillInAnswers.length} 正解
          </p>
          <Button onClick={onNext} className="w-full bg-gold-gradient text-jigen-bg-dark hover:opacity-90">
            次の問題へ <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// =================== メインダイアログ ===================

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
  const [phase, setPhase] = useState<Phase>('summary');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  // ダイアログが閉じたら state リセット(次に開いた時にクリーン)
  useEffect(() => {
    if (!open) {
      setPhase('summary');
      setReviewIdx(0);
      setCorrectCount(0);
      setIncorrectCount(0);
    }
  }, [open]);

  async function handleCloseInternal() {
    if (!data) return;
    setSubmitting(true);
    try { await onMarkSeen(data.currentMilestone); } catch {}
    setSubmitting(false);
    onClose();
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
        {phase === 'summary' ? (
          <>
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
                    <SummaryCard key={m.questionId} mistake={m} />
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
                  onClick={() => { setPhase('review'); setReviewIdx(0); }}
                  className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
                >
                  <PenLine className="mr-1 h-4 w-4" />
                  穴埋めでまとめて復習 ({data.mistakes.length}問)
                  <ArrowRight className="ml-1 h-4 w-4" />
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
          </>
        ) : null}

        {phase === 'review' && data.mistakes[reviewIdx] ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg text-jigen-ink">穴埋め復習</DialogTitle>
            </DialogHeader>
            <ReviewStep
              key={data.mistakes[reviewIdx]!.questionId}
              mistake={data.mistakes[reviewIdx]!}
              index={reviewIdx}
              total={data.mistakes.length}
              onCorrect={() => setCorrectCount((n) => n + 1)}
              onIncorrect={() => setIncorrectCount((n) => n + 1)}
              onNext={() => {
                if (reviewIdx + 1 >= data.mistakes.length) {
                  setPhase('done');
                } else {
                  setReviewIdx((i) => i + 1);
                }
              }}
            />
            <div className="mt-2 flex justify-between text-[11px] text-jigen-ink-mute">
              <button
                type="button"
                onClick={() => setPhase('summary')}
                className="inline-flex items-center gap-1 hover:text-jigen-gold"
              >
                <ArrowLeft className="h-3 w-3" /> サマリに戻る
              </button>
              <span>正解 {correctCount} / 間違い {incorrectCount}</span>
            </div>
          </>
        ) : null}

        {phase === 'done' ? (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <TiranoSensei size="md" glow />
              </div>
              <DialogTitle className="text-center text-xl text-jigen-ink">
                復習 完了!お疲れさま!
              </DialogTitle>
            </DialogHeader>
            <section className="mt-2 rounded-xl border border-jigen-gold/40 bg-panel-gradient p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
                穴埋め復習の結果
              </p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-jigen-gold">
                {correctCount}<span className="text-base text-jigen-ink-soft">/{data.mistakes.length}</span>
              </p>
              <p className="mt-1 text-xs text-jigen-ink-soft">
                ここで定着させたぶん、 本番の点が育ちます。
              </p>
            </section>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={handleCloseInternal}
                disabled={submitting}
                className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
              >
                <Check className="mr-1 h-4 w-4" />
                続けて解く
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
