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
import { Check, ChevronDown, ChevronUp, Home, Shuffle, Timer, Target, X } from 'lucide-react';
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

// ============= 進捗バー / ストップウォッチ =============

const SESSION_START_KEY_PREFIX = 'jigen_session_start_v1';

function getJstDateStr(): string {
  // Asia/Tokyo の YYYY-MM-DD を返す。日付境界(JST 00:00)でセッションリセット用
  const d = new Date();
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 10);
}

function getOrCreateSessionStart(): number {
  if (typeof window === 'undefined') return Date.now();
  const key = `${SESSION_START_KEY_PREFIX}_${getJstDateStr()}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const t = parseInt(raw, 10);
      if (Number.isFinite(t) && t > 0) return t;
    }
  } catch {}
  const now = Date.now();
  try {
    localStorage.setItem(key, String(now));
  } catch {}
  return now;
}

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * ストップウォッチ: 「今日の問題」を最初に開いた時刻からの累積経過時間
 * - localStorage 保存で、リロード・問題切替を跨いで継続
 * - JST日付が変わると新セッション扱い
 */
function StopwatchBadge() {
  const [elapsed, setElapsed] = useState<number>(0);
  useEffect(() => {
    const start = getOrCreateSessionStart();
    setElapsed(Math.floor((Date.now() - start) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      role="timer"
      aria-label={`経過時間 ${formatElapsed(elapsed)}`}
      className="flex items-center gap-2 rounded-lg border border-jigen-border-soft bg-jigen-bg-panel px-3 py-2"
    >
      <Timer aria-hidden className="h-4 w-4 text-jigen-gold" />
      <div className="flex flex-col leading-none">
        <span className="text-[9px] uppercase tracking-widest text-jigen-ink-mute">
          経過時間
        </span>
        <span className="mt-0.5 text-lg font-extrabold tabular-nums tracking-tight text-jigen-ink">
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
}

/**
 * 今日の進捗バッジ(大きめ版)
 * - 目標未達: ゴールド「N / 25問」+ プログレスバー
 * - 目標達成: エメラルド「達成🎉 +N」+ プログレスバー満タン
 * - 目標達成しても問題は出続ける
 */
function DailyProgressBadge({ solved, target }: { solved: number; target: number }) {
  const reached = solved >= target;
  const over = Math.max(0, solved - target);
  const pct = Math.min(100, Math.round((solved / Math.max(1, target)) * 100));
  return (
    <div
      role="status"
      aria-label={`今日解いた問題 ${solved} / ${target}`}
      className={cn(
        'flex flex-1 flex-col gap-1.5 rounded-lg border px-3 py-2 min-w-[160px]',
        reached
          ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
          : 'border-jigen-gold/40 bg-jigen-bg-panel',
      )}
    >
      <div className="flex items-center gap-2">
        <Target
          aria-hidden
          className={cn('h-4 w-4', reached ? 'text-emerald-400' : 'text-jigen-gold')}
        />
        <div className="flex flex-col leading-none">
          <span className="text-[9px] uppercase tracking-widest text-jigen-ink-mute">
            {reached ? '目標達成' : '今日の問題'}
          </span>
          <span className="mt-0.5 tabular-nums leading-none">
            <span
              className={cn(
                'text-lg font-extrabold',
                reached ? 'text-emerald-300' : 'text-jigen-gold',
              )}
            >
              {solved}
            </span>
            <span className="ml-0.5 text-xs text-jigen-ink-mute">/ {target}問</span>
          </span>
        </div>
        {reached ? (
          <span className="ml-auto whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            🎉 +{over}
          </span>
        ) : (
          <span className="ml-auto tabular-nums text-[10px] text-jigen-ink-mute">{pct}%</span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-jigen-bg-panel-2">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            reached ? 'bg-emerald-400' : 'bg-gold-gradient',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PracticeRunner({
  question,
  onNext,
  source = 'daily',
  todaySolved,
  todayTarget,
  onAnsweredDaily,
}: {
  question: RunnerQuestion;
  /** 「次の問題へ」を URLナビなしで即時切替するための親コールバック(任意) */
  onNext?: () => void | Promise<void>;
  /** どこから演習しているか。'mistakes' の場合は ホーム進捗にカウントしない */
  source?: 'daily' | 'mistakes' | 'other';
  /** 今日解いた問題数(source='daily' のみ) */
  todaySolved?: number;
  /** 今日の目標問題数 */
  todayTarget?: number;
  /** 解答送信成功時に親側で楽観的に +1 するためのコールバック(daily のみ) */
  onAnsweredDaily?: () => void;
}) {
  const router = useRouter();

  // choices が 5つ = 応用能力(五肢二択・正解2つを選ぶ)、それ以外は単一選択
  const requiredAnswers = question.choices.length >= 5 ? 2 : 1;
  const isMulti = requiredAnswers >= 2;

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(() => new Set());
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

  // 選択肢タップ: ハイライトのみ(まだ送信しない)
  function pickChoice(idx: number) {
    if (phase !== 'answering') return;
    if (isMulti) {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) {
          next.delete(idx);
        } else {
          if (next.size >= requiredAnswers) {
            // 3つ目を押した場合: 最も古い1つを外すよりも、最大数で打ち止めにする方が明確
            return prev;
          }
          next.add(idx);
        }
        return next;
      });
    } else {
      setSelectedIdx(idx);
    }
  }

  // 「解答する」ボタン押下時に送信
  async function confirmAnswer() {
    if (phase !== 'answering') return;
    if (isMulti) {
      if (selectedSet.size !== requiredAnswers) return;
    } else {
      if (selectedIdx === null) return;
    }
    setPhase('submitting');

    // DB の questions.answer は「正答番号(1始まり)」で格納。
    // multi の場合は配列で送る。
    const userAnswer = isMulti
      ? { value: Array.from(selectedSet).map((i) => i + 1).sort((a, b) => a - b) }
      : { value: (selectedIdx as number) + 1 };
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
          source,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as AttemptSubmitResponse;
      setResult(data);
      setPhase('judged');
      // 楽観: source='daily' の場合のみ今日の進捗を +1(親に通知)
      if (source === 'daily' && onAnsweredDaily) onAnsweredDaily();
    } catch (e) {
      setErrorMessage((e as Error).message || '送信に失敗しました');
      setPhase('error');
    }
  }

  function handleNext() {
    // 親が onNext を提供している場合は URLナビなしで瞬間切替
    if (onNext) {
      void onNext();
      return;
    }
    // フォールバック: URLナビで再フェッチ
    router.push(`/practice/random?t=${Date.now()}`);
  }

  // 正解選択肢の集合(API レスポンスから推定)
  // 単一: { value: 3 } or 3 or "3"  → Set([3])
  // 複数: [3, 5] or { value: [3, 5] } → Set([3, 5])
  const correctSet: Set<number> = useMemo(() => {
    const empty = new Set<number>();
    if (!result) return empty;
    const raw = result.correctAnswer as unknown;
    const inner = raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)
      ? (raw as { value: unknown }).value
      : raw;
    if (Array.isArray(inner)) {
      const set = new Set<number>();
      for (const x of inner) {
        const n = Number(x);
        if (Number.isFinite(n)) set.add(n);
      }
      return set;
    }
    const n = Number(inner);
    return Number.isFinite(n) ? new Set([n]) : empty;
  }, [result]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 text-jigen-ink">
      {/* 上部1段目: 中断 / 教科ラベル */}
      <div className="flex items-center justify-between gap-2">
        <InterruptDialog />
        <span className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
          {question.section} / {question.subTopic}
        </span>
      </div>

      {/* 上部2段目: ストップウォッチ + 今日の進捗(daily のときのみ) */}
      {source === 'daily' ? (
        <div className="flex items-stretch gap-2">
          <StopwatchBadge />
          {typeof todaySolved === 'number' && typeof todayTarget === 'number' ? (
            <DailyProgressBadge solved={todaySolved} target={todayTarget} />
          ) : null}
        </div>
      ) : null}

      {/* 問題本文 */}
      <article
        aria-label="問題"
        className={cn(
          'rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel',
          phase === 'judged' && result?.isCorrect && 'ring-1 ring-jigen-gold/60',
          phase === 'judged' && result && !result.isCorrect && 'ring-1 ring-jigen-warning/50',
        )}
      >
        {/* オーナー指示: 年度・AM/PM・問題番号はユーザー側に表示しない(オリジナル問題として提供) */}
        <div className="whitespace-pre-line text-[15px] leading-relaxed text-jigen-ink">
          {question.bodyMd}
        </div>
      </article>

      {/* 選択肢 */}
      <ul className="flex flex-col gap-3" aria-label="選択肢">
        {question.choices.map((label, i) => {
          const isPicked = isMulti ? selectedSet.has(i) : selectedIdx === i;
          // 正解選択肢: 番号(i+1)が正解集合に含まれる
          const isCorrectOne = phase === 'judged' && correctSet.has(i + 1);
          const isWrongPicked =
            phase === 'judged' && isPicked && !isCorrectOne && result && !result.isCorrect;
          const disabled = phase !== 'answering';
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => pickChoice(i)}
                disabled={disabled}
                aria-label={`選択肢 ${i + 1}: ${label}`}
                className={cn(
                  'relative flex w-full items-start gap-3 rounded-lg border bg-jigen-bg-panel p-3 text-left text-[15px] leading-relaxed min-h-[48px]',
                  'border-jigen-border-soft transition-all duration-150',
                  'hover:border-jigen-gold/50 hover:bg-jigen-bg-panel-2',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark',
                  'disabled:cursor-default disabled:hover:border-jigen-border-soft disabled:hover:bg-jigen-bg-panel',
                  // 選択中(回答前): 控えめなボーダー強調のみ。背景は変えない(文章可読性優先)
                  isPicked && phase === 'answering' && 'border-jigen-gold',
                  isPicked && phase === 'submitting' && 'border-jigen-gold/60',
                  isCorrectOne && 'border-jigen-gold bg-jigen-bg-panel-2 text-jigen-gold shadow-gold-glow',
                  isWrongPicked && 'border-jigen-warning bg-jigen-warning-soft/30 text-jigen-ink',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-all',
                    'border-jigen-border-soft text-jigen-ink-soft',
                    // 選択中: 番号ラベルもゴールド塗りつぶし
                    isPicked && phase === 'answering' && 'border-jigen-gold bg-jigen-gold text-jigen-bg-dark scale-110',
                    isCorrectOne && 'border-jigen-gold bg-jigen-gold text-jigen-bg-dark',
                    isWrongPicked && 'border-jigen-warning bg-jigen-warning text-jigen-ink',
                  )}
                >
                  {isCorrectOne ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isWrongPicked ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="flex-1">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 解答ボタン(誤タップ防止: 選択→確認→送信) */}
      {(phase === 'answering' || phase === 'submitting') ? (
        <div className="sticky bottom-4 z-10 flex flex-col items-center gap-2">
          {isMulti ? (
            <p className="rounded-md bg-jigen-bg-panel/80 px-3 py-1 text-[11px] text-jigen-ink-soft backdrop-blur">
              この問題は<span className="font-bold text-jigen-gold"> 2つ </span>選んでください
            </p>
          ) : null}
          <Button
            type="button"
            onClick={confirmAnswer}
            disabled={
              (isMulti ? selectedSet.size !== requiredAnswers : selectedIdx === null) ||
              phase === 'submitting'
            }
            className="h-14 min-w-[240px] rounded-xl bg-gold-gradient px-8 text-base font-bold text-slate-900 shadow-gold-glow transition-transform hover:scale-[1.02] hover:shadow-gold-glow-strong disabled:opacity-50 disabled:hover:scale-100"
            aria-label={
              isMulti
                ? selectedSet.size === 0
                  ? '選択肢を選んでください'
                  : selectedSet.size < requiredAnswers
                    ? `あと${requiredAnswers - selectedSet.size}つ選んでください`
                    : `選択肢 ${Array.from(selectedSet).map((i) => i + 1).sort().join(', ')} で解答する`
                : selectedIdx === null
                  ? '選択肢を選んでから解答してください'
                  : `選択肢 ${selectedIdx + 1} で解答する`
            }
          >
            {phase === 'submitting'
              ? '採点中...'
              : isMulti
                ? selectedSet.size === 0
                  ? '選択肢を選んでください'
                  : selectedSet.size < requiredAnswers
                    ? `あと${requiredAnswers - selectedSet.size}つ選んでください`
                    : `解答する(${Array.from(selectedSet).map((i) => i + 1).sort().join('・')}を選択中)`
                : selectedIdx === null
                  ? '選択肢を選んでください'
                  : `解答する(${selectedIdx + 1}を選択中)`}
          </Button>
        </div>
      ) : null}

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
                {correctSet.size > 0 ? (
                  <p className="mb-2 text-xs text-jigen-ink-mute">
                    正解:{' '}
                    <span className="font-semibold text-jigen-gold">
                      {Array.from(correctSet).sort((a, b) => a - b).join('・')}
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
            <Button asChild variant="outline" className="border-jigen-border-soft bg-transparent text-jigen-ink hover:border-jigen-gold/60 hover:bg-jigen-bg-panel-2 hover:text-jigen-ink">
              <Link href="/home">
                <Home aria-hidden className="mr-1 h-4 w-4" />
                中断する
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
