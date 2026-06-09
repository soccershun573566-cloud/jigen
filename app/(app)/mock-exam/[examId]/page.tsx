// /mock-exam/[examId] — 模試の開始/受験/完了ページ(クライアント側で状態管理)
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Brain, Check, ChevronLeft, ChevronRight, Loader2,
  Pause, Play, Sparkles, Target, X,
} from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { cn } from '@/lib/utils';
import { clearPracticeQueue } from '@/lib/practice/queue';

type ExamMeta = {
  id: string;
  title: string;
  description: string;
  questions_count: number;
  one_time: boolean;
};
type Question = {
  id: string;
  body_md: string;
  choices: string[];
  section: string;
  sub_topic: string;
  order_index: number;
};
type Attempt = {
  id: string;
  started_at: string;
  completed_at: string | null;
  current_question_index: number;
  answers: Record<string, number>;
  score: number | null;
  section_scores: Record<string, { total: number; correct: number }> | null;
};
type ExamData = { exam: ExamMeta; questions: Question[]; attempt: Attempt | null };

type SectionStats = { total: number; correct: number };

function extractChoices(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch { /* */ }
  }
  return [];
}

export default function MockExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [data, setData] = useState<ExamData | null>(null);
  const [phase, setPhase] = useState<'intro' | 'taking' | 'submitting' | 'result' | 'loading'>('loading');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completeResult, setCompleteResult] = useState<{ score: number; total: number; sectionScores: Record<string, SectionStats> } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 初回ロード
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/mock-exam/${examId}`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as ExamData;
        // 選択肢の正規化
        d.questions = d.questions.map((q) => ({ ...q, choices: extractChoices(q.choices) }));
        setData(d);

        if (d.attempt?.completed_at) {
          // 完了済 → 結果表示
          if (d.attempt.score !== null && d.attempt.section_scores) {
            setCompleteResult({
              score: d.attempt.score,
              total: d.exam.questions_count,
              sectionScores: d.attempt.section_scores,
            });
            // 完了済の模試を再表示する流入時もキューをクリア(念のため)
            clearPracticeQueue();
            setPhase('result');
            return;
          }
        }
        if (d.attempt) {
          // 中断状態 → そのまま続きから
          setCurrentIndex(d.attempt.current_question_index);
          setAnswers(d.attempt.answers ?? {});
          setPhase('intro'); // 「再開しますか」の画面を出す
        } else {
          setPhase('intro');
        }
      } catch (e) {
        setErrorMsg((e as Error).message || 'データ取得に失敗しました');
        setPhase('intro');
      }
    })();
  }, [examId]);

  const currentQuestion = useMemo(() => {
    if (!data) return null;
    return data.questions[currentIndex] ?? null;
  }, [data, currentIndex]);

  async function saveProgress(idx: number, ans: Record<string, number>) {
    try {
      await fetch(`/api/mock-exam/${examId}/progress`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentIndex: idx, answers: ans }),
      });
    } catch { /* 失敗してもUIは続行 */ }
  }

  function handleSelect(value: number) {
    if (!currentQuestion) return;
    const key = String(currentQuestion.order_index);
    const next = { ...answers, [key]: value };
    setAnswers(next);
    // 即座にバックグラウンド保存
    void saveProgress(currentIndex, next);
  }

  function handleNext() {
    if (!data) return;
    if (currentIndex < data.questions.length - 1) {
      const newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      void saveProgress(newIdx, answers);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      const newIdx = currentIndex - 1;
      setCurrentIndex(newIdx);
      void saveProgress(newIdx, answers);
    }
  }

  async function handleSubmit() {
    if (!data) return;
    setPhase('submitting');
    try {
      const res = await fetch(`/api/mock-exam/${examId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      const result = (await res.json()) as { score: number; total: number; sectionScores: Record<string, SectionStats> };
      setCompleteResult(result);
      // 模試完了 → 出題ロジックが変わるので、 古いキャッシュキューを破棄
      // (注意点2の対策: 直後の「次の問題」 が古い出題ロジックで取られたものにならないように)
      clearPracticeQueue();
      setPhase('result');
    } catch (e) {
      setErrorMsg((e as Error).message || '提出に失敗しました');
      setPhase('taking');
    }
  }

  function handleInterrupt() {
    if (!confirm('受験を中断しますか? 進捗は自動保存されており、 ホーム画面からいつでも再開できます。')) return;
    router.push('/home');
  }

  // ========== Render ==========

  if (phase === 'loading' || !data) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center gap-4 px-5 py-10 text-jigen-ink">
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-jigen-gold" />
        <p className="text-sm text-jigen-ink-soft">読み込み中...</p>
      </main>
    );
  }

  if (phase === 'intro') {
    const isResume = !!data.attempt && !data.attempt.completed_at;
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-8 text-jigen-ink">
        <div className="mb-6 flex justify-center">
          <TiranoSensei size="xl" glow />
        </div>
        <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
          {isResume ? 'Resume' : 'Initial Diagnosis'}
        </p>
        <h1 className="mb-3 text-center text-2xl font-extrabold tracking-tight text-jigen-ink drop-shadow-[0_0_10px_rgba(245,196,65,0.25)]">
          {data.exam.title}
        </h1>
        <p className="mb-6 text-center text-sm leading-relaxed text-jigen-ink [text-wrap:balance]">
          {data.exam.description}
        </p>

        <section className="mb-6 rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-6 shadow-gold-glow">
          <div className="mb-4 flex items-center gap-3">
            <Brain aria-hidden className="h-6 w-6 text-jigen-gold" />
            <h2 className="text-lg font-bold text-jigen-ink">
              受験完了後、 <span className="text-jigen-gold">AIの出題傾向があなた専用に</span> なります
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-jigen-ink-soft">
            <li className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-jigen-gold" />
              50問の結果から、 教科別・小単元別の弱点プロファイルを自動生成
            </li>
            <li className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-jigen-gold" />
              翌日から、 あなたの弱点に最適化されます
            </li>
            <li className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-jigen-gold" />
              受験中はいつでも中断可。 進捗は自動保存(再開可能)
            </li>
          </ul>
        </section>

        <section className="mb-6 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5">
          <h3 className="mb-3 text-sm font-bold text-jigen-ink">受験要項</h3>
          <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
            <li>・問題数: <span className="font-bold text-jigen-gold">{data.exam.questions_count}問</span>(本試験形式・四肢択一)</li>
            <li>・想定時間: <span className="font-bold text-jigen-gold">約60〜90分</span></li>
            <li>・回数制限: <span className="font-bold text-jigen-warning">1度限り</span>(慎重に解いてください)</li>
            <li>・中断: <span className="font-bold text-jigen-gold">可能</span>(進捗は自動保存)</li>
          </ul>
        </section>

        {errorMsg ? <p className="mb-4 text-center text-xs text-jigen-warning">{errorMsg}</p> : null}

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setPhase('taking')}
            className="inline-flex h-14 min-w-[260px] items-center justify-center gap-2 rounded-xl bg-gold-gradient px-8 text-base font-bold text-jigen-bg-dark shadow-gold-glow transition-transform hover:scale-[1.02]"
          >
            {isResume ? <><Play className="h-5 w-5" />続きから再開</> : <><Sparkles className="h-5 w-5" />模試を始める</>}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
          <Link href="/home" className="text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline">
            ホームに戻る(あとでやる)
          </Link>
        </div>
      </main>
    );
  }

  if (phase === 'taking' || phase === 'submitting') {
    const q = currentQuestion;
    if (!q) {
      return (
        <main className="mx-auto max-w-md p-8 text-center text-jigen-ink">
          <p>問題データが読み込めませんでした。</p>
          <Link href="/home" className="text-jigen-gold underline">ホームに戻る</Link>
        </main>
      );
    }
    const total = data.questions.length;
    const selected = answers[String(q.order_index)] ?? null;
    const answeredCount = Object.keys(answers).length;
    const progressPct = Math.round((answeredCount / total) * 100);
    const isLast = currentIndex === total - 1;

    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-5 text-jigen-ink">
        {/* ヘッダー */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleInterrupt}
            className="inline-flex items-center gap-1 rounded-md border border-jigen-border-soft bg-jigen-bg-panel px-3 py-1.5 text-xs text-jigen-ink hover:border-jigen-gold/40"
          >
            <Pause aria-hidden className="h-3.5 w-3.5" />
            中断する
          </button>
          <span className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
            初回模試 / 第{currentIndex + 1}問 of {total}
          </span>
        </div>

        {/* 進捗バー */}
        <div className="mb-4 rounded-lg border border-jigen-gold/30 bg-jigen-bg-panel p-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">解答済</span>
            <span className="tabular-nums text-jigen-gold">
              <span className="text-lg font-bold">{answeredCount}</span>
              <span className="text-xs text-jigen-ink-mute">/ {total}問</span>
              <span className="ml-2 text-xs">{progressPct}%</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-jigen-bg-panel-2">
            <div className="h-full bg-gold-gradient transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* セクションラベル */}
        <p className="mb-2 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
          {q.section} / {q.sub_topic}
        </p>

        {/* 問題 */}
        <article className="mb-5 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-jigen-ink">
            {q.body_md}
          </p>
        </article>

        {/* 選択肢 */}
        <ul className="mb-5 flex flex-col gap-3">
          {q.choices.map((label, i) => {
            const num = i + 1;
            const isPicked = selected === num;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelect(num)}
                  disabled={phase === 'submitting'}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border bg-jigen-bg-panel p-3 text-left text-[15px] leading-relaxed min-h-[48px]',
                    'border-jigen-border-soft transition-all duration-150',
                    'hover:border-jigen-gold/50 hover:bg-jigen-bg-panel-2',
                    isPicked && 'border-jigen-gold bg-jigen-bg-panel-2',
                  )}
                >
                  <span className={cn(
                    'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold',
                    isPicked ? 'border-jigen-gold bg-jigen-gold text-jigen-bg-dark' : 'border-jigen-border-soft text-jigen-ink-soft',
                  )}>
                    {num}
                  </span>
                  <span className="flex-1">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* ナビゲーション */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0 || phase === 'submitting'}
            className="inline-flex items-center gap-1 rounded-md border border-jigen-border-soft bg-jigen-bg-panel px-4 py-2 text-sm text-jigen-ink disabled:opacity-30"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            前へ
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={phase === 'submitting'}
              className="inline-flex items-center gap-1 rounded-md bg-gold-gradient px-5 py-2 text-sm font-bold text-jigen-bg-dark"
            >
              次へ
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={phase === 'submitting' || answeredCount < total}
              className="inline-flex items-center gap-2 rounded-md bg-gold-gradient px-6 py-2.5 text-sm font-bold text-jigen-bg-dark disabled:opacity-50"
            >
              {phase === 'submitting' ? (
                <><Loader2 className="h-4 w-4 animate-spin" />採点中...</>
              ) : (
                <><Check className="h-4 w-4" />全問解答完了して提出</>
              )}
            </button>
          )}
        </div>

        {answeredCount < total && isLast ? (
          <p className="mt-3 text-center text-xs text-jigen-warning">
            未解答が {total - answeredCount}問 あります。 全問解答してから提出してください。
          </p>
        ) : null}
      </main>
    );
  }

  if (phase === 'result' && completeResult) {
    const { score, total, sectionScores } = completeResult;
    const pct = Math.round((score / total) * 100);
    const sections = Object.entries(sectionScores);
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-8 text-jigen-ink">
        <div className="mb-6 flex justify-center">
          <TiranoSensei size="xl" glow />
        </div>
        <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
          診断結果
        </p>
        <h1 className="mb-2 text-center text-2xl font-extrabold tracking-tight text-jigen-ink drop-shadow-[0_0_10px_rgba(245,196,65,0.25)]">
          現状把握模試 完了!
        </h1>
        <p className="mb-6 text-center text-sm text-jigen-ink">
          お疲れさまでした。 結果はあなただけが見られます。
        </p>

        {/* 全体スコア */}
        <section className="mb-6 rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-8 text-center shadow-gold-glow">
          <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-gold">あなたの正答数</p>
          <p className="mt-2 text-6xl font-extrabold tabular-nums text-jigen-gold">
            {score}<span className="text-2xl text-jigen-ink-soft">/{total}</span>
          </p>
          <p className="mt-1 text-sm text-jigen-ink-soft">{pct}% 正答</p>
          <p className="mt-4 text-xs text-jigen-ink-soft">
            1級建築施工管理技士(第一次)の<span className="font-bold text-jigen-gold">合格目安は60%</span>と言われています。
          </p>
        </section>

        {/* 教科別 */}
        <section className="mb-6 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
          <h2 className="mb-3 text-sm font-bold text-jigen-ink">教科別 達成率</h2>
          <ul className="space-y-3">
            {sections.map(([sec, ss]) => {
              const p = Math.round((ss.correct / ss.total) * 100);
              const color = p >= 60 ? 'bg-emerald-400' : p >= 40 ? 'bg-jigen-gold' : 'bg-jigen-warning';
              return (
                <li key={sec}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-jigen-ink">{sec}</span>
                    <span className="text-xs tabular-nums text-jigen-ink-soft">
                      <span className="font-bold text-jigen-gold">{ss.correct}</span>/{ss.total}問 ({p}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-jigen-bg-panel-2">
                    <div className={cn('h-full transition-[width] duration-700', color)} style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ティラノ先生コメント */}
        <section className="mb-6 rounded-xl border border-jigen-gold/30 bg-panel-gradient p-5">
          <div className="flex items-start gap-3">
            <TiranoSensei size="sm" glow />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-jigen-gold">ティラノ先生からのコメント</p>
              <p className="mt-2 text-sm leading-relaxed text-jigen-ink-soft">
                {pct >= 60
                  ? `素晴らしいです。現状でも合格圏に近い水準です。 翌日からは、まだ少し弱いところを集中的に補強していきましょう。`
                  : pct >= 40
                  ? `現状の出題傾向が分かりました。 合格圏まであと一歩。 翌日からのAI出題が、 あなたの弱点に最適化されます。`
                  : `現状を正直に出してくれてありがとう。 ここからが本番です。 翌日からのAI出題が、 一緒に走ってくれます。`
                }
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/practice/random"
            className="inline-flex h-14 min-w-[260px] items-center justify-center gap-2 rounded-xl bg-gold-gradient px-8 text-base font-bold text-jigen-bg-dark shadow-gold-glow transition-transform hover:scale-[1.02]"
          >
            <Target className="h-5 w-5" />
            今日の問題を解く
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/home" className="text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline">
            ホームに戻る
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
