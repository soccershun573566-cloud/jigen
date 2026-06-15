// /weekly-test — 金曜小テスト(25問・週1度・直近7日の解答ベース)
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Loader2,
  Sparkles, Target, X,
} from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { cn } from '@/lib/utils';
import { clearPracticeQueue } from '@/lib/practice/queue';

type Phase = 'loading' | 'upcoming' | 'no_data' | 'intro' | 'taking' | 'submitting' | 'result' | 'completed_view' | 'error';

type ApiQuestion = {
  id: string;
  body_md: string;
  choices: string[] | { items?: string[] } | unknown;
  section: string;
  sub_topic: string;
  order_index: number;
};
type Attempt = {
  id: string;
  question_ids: string[];
  answers: Record<string, number>;
  current_question_index: number;
  score: number | null;
  section_scores: Record<string, { total: number; correct: number }> | null;
  completed_at: string | null;
};
type ApiResponse = {
  monday: string; friday: string;
  isOpen: boolean; daysToFriday: number; today: string;
  status: 'upcoming' | 'available' | 'in_progress' | 'completed' | 'no_data';
  message?: string;
  attempt: Attempt | null;
  questions: ApiQuestion[];
};

function extractChoices(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(x => typeof x === 'string') as string[];
  if (raw && typeof raw === 'object') {
    const items = (raw as { items?: unknown }).items;
    if (Array.isArray(items)) return items.filter(x => typeof x === 'string') as string[];
  }
  return [];
}

export default function WeeklyTestPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; total: number; sectionScores: Record<string, { total: number; correct: number }> } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/weekly-test', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as ApiResponse;
        setData(d);

        if (d.status === 'completed' && d.attempt?.score != null) {
          setResult({
            score: d.attempt.score,
            total: d.questions.length || d.attempt.question_ids?.length || 25,
            sectionScores: d.attempt.section_scores ?? {},
          });
          setPhase('completed_view');
          return;
        }
        if (d.status === 'upcoming') { setPhase('upcoming'); return; }
        if (d.status === 'no_data') { setPhase('no_data'); return; }
        if (d.attempt && !d.attempt.completed_at) {
          // 中断状態 → 再開
          setCurrentIndex(d.attempt.current_question_index);
          setAnswers(d.attempt.answers ?? {});
          setPhase('intro');
        } else {
          setPhase('intro');
        }
      } catch (e) {
        setErrorMsg((e as Error).message || 'データ取得に失敗しました');
        setPhase('error');
      }
    })();
  }, []);

  const questions = data?.questions ?? [];
  const total = questions.length;
  const currentQ = questions[currentIndex];

  const choices = useMemo(() => currentQ ? extractChoices(currentQ.choices) : [], [currentQ]);
  const currentAnswer = currentQ ? answers[String(currentQ.order_index)] : undefined;

  async function saveProgress(idx: number, ans: Record<string, number>) {
    if (!data) return;
    try {
      await fetch('/api/weekly-test/progress', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ weekStart: data.monday, currentIndex: idx, answers: ans }),
      });
    } catch { /* 中断保存は失敗しても続行 */ }
  }

  function pick(num: number) {
    if (!currentQ) return;
    const idx = String(currentQ.order_index);
    const next = { ...answers, [idx]: num };
    setAnswers(next);
    void saveProgress(currentIndex, next);
  }

  function go(direction: 1 | -1) {
    const newIdx = currentIndex + direction;
    if (newIdx >= 0 && newIdx < total) {
      setCurrentIndex(newIdx);
      void saveProgress(newIdx, answers);
    }
  }

  async function submit() {
    if (!data) return;
    setPhase('submitting');
    try {
      const res = await fetch('/api/weekly-test/complete', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ weekStart: data.monday, answers }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      const r = (await res.json()) as { score: number; total: number; sectionScores: Record<string, { total: number; correct: number }> };
      setResult(r);
      clearPracticeQueue();
      setPhase('result');
    } catch (e) {
      setErrorMsg((e as Error).message || '提出に失敗しました');
      setPhase('taking');
    }
  }

  // ============ ローディング / エラー ============
  if (phase === 'loading') {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4">
        <TiranoSensei size="lg" glow />
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-jigen-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          金曜小テストを準備中...
        </p>
      </main>
    );
  }
  if (phase === 'error') {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <TiranoSensei size="md" />
        <p className="text-base font-bold text-jigen-warning">読み込み失敗</p>
        <p className="text-xs text-jigen-ink-mute">{errorMsg}</p>
        <Link href="/home" className="mt-3 text-sm text-jigen-gold underline">ホームに戻る</Link>
      </main>
    );
  }

  // ============ 開催前(月-木) ============
  if (phase === 'upcoming') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 text-jigen-ink">
        <header className="mb-6 border-b border-jigen-gold/30 pb-4">
          <h1 className="text-3xl font-black tracking-wider bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.5)]">
            金曜小テスト
          </h1>
          <p className="mt-2 text-sm font-semibold text-jigen-ink">毎週金曜開催・25問・直近の解答から出題</p>
        </header>
        <section className="rounded-2xl border border-jigen-gold/40 bg-panel-gradient p-6 shadow-panel text-center">
          <TiranoSensei size="lg" glow />
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">Coming Friday</p>
          <p className="mt-2 text-2xl font-extrabold text-jigen-ink">
            次の開催まで <span className="text-jigen-gold">{data?.daysToFriday}日</span>
          </p>
          <p className="mt-3 text-sm text-jigen-ink-soft leading-relaxed">
            <b className="text-jigen-gold">毎週金曜0時(JST)</b> から日曜まで受験できます。<br />
            直近7日間に解いた問題から、 <b>正解13問+間違え12問</b> の25問構成。<br />
            これまでの学習を <b>定着</b> させましょう。
          </p>
          <Link href="/home" className="mt-6 inline-block text-sm text-jigen-gold underline underline-offset-4">
            ホームに戻る
          </Link>
        </section>
      </main>
    );
  }

  // ============ データ不足 ============
  if (phase === 'no_data') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 text-jigen-ink">
        <header className="mb-6 border-b border-jigen-gold/30 pb-4">
          <h1 className="text-3xl font-black tracking-wider bg-gold-gradient bg-clip-text text-transparent">
            金曜小テスト
          </h1>
        </header>
        <section className="rounded-2xl border border-jigen-warning/40 bg-jigen-bg-panel p-6 shadow-panel text-center">
          <TiranoSensei size="lg" />
          <p className="mt-4 text-base font-bold text-jigen-ink">データが足りません</p>
          <p className="mt-2 text-sm text-jigen-ink-soft leading-relaxed">
            {data?.message ?? '直近7日間に問題を解いた記録がないため、 今週は出題できません。'}
          </p>
          <Link href="/practice/random" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-4 text-sm font-bold text-jigen-bg-dark shadow-gold-glow">
            今日の問題を解く <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    );
  }

  // ============ 結果画面(直前完了 or 既存完了) ============
  if ((phase === 'result' || phase === 'completed_view') && result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 text-jigen-ink">
        <header className="mb-6 border-b border-jigen-gold/30 pb-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-jigen-gold">Weekly Test Result</p>
          <h1 className="mt-1 text-3xl font-black tracking-wider bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.5)]">
            金曜小テスト 結果
          </h1>
        </header>
        <section className="mb-6 rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-8 shadow-gold-glow text-center">
          <TiranoSensei size="lg" glow />
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">Total Score</p>
          <p className="mt-1 text-6xl font-extrabold tabular-nums text-jigen-gold drop-shadow-[0_0_24px_rgba(245,196,65,0.7)]">
            {result.score}<span className="ml-1 text-2xl font-medium text-jigen-ink-soft">/{result.total}問</span>
          </p>
          <p className="mt-2 text-lg font-bold text-jigen-ink">正答率 {pct}%</p>
        </section>

        {Object.keys(result.sectionScores).length > 0 ? (
          <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-jigen-gold">教科別スコア</h2>
            <ul className="space-y-2">
              {Object.entries(result.sectionScores).map(([sec, s]) => {
                const p = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <li key={sec} className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-jigen-ink">{sec}</span>
                    <span className="text-sm font-bold text-jigen-gold tabular-nums">{s.correct}/{s.total} ({p}%)</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Link href="/review" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink hover:border-jigen-gold">
            <Sparkles className="h-4 w-4" />学習履歴を見る
          </Link>
          <Link href="/home" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-4 text-sm font-bold text-jigen-bg-dark shadow-gold-glow">
            ホームに戻る <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  // ============ 開始前画面(intro) ============
  if (phase === 'intro' && data) {
    const isResume = data.attempt && !data.attempt.completed_at && data.attempt.current_question_index > 0;
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 text-jigen-ink">
        <header className="mb-6 border-b border-jigen-gold/30 pb-4">
          <h1 className="text-3xl font-black tracking-wider bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.5)]">
            金曜小テスト
          </h1>
          <p className="mt-2 text-sm font-semibold text-jigen-ink">{data.monday} 週(〜{data.friday}金曜)</p>
        </header>
        <section className="mb-6 rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-6 shadow-gold-glow text-center">
          <TiranoSensei size="lg" glow />
          <p className="mt-4 text-2xl font-extrabold text-jigen-ink">{total}問のテスト</p>
          <p className="mt-2 text-sm text-jigen-ink-soft leading-relaxed">
            直近7日間にあなたが解いた問題から<br />
            <b>正解13問+間違え12問</b> を出題します。<br />
            学習の <b>定着度を確認</b> しましょう。
          </p>
          <ul className="mt-4 space-y-1 text-left text-xs text-jigen-ink-soft">
            <li>• 中断はいつでも可能(進捗自動保存)</li>
            <li>• 完了後、 結果は学習履歴に記録されます</li>
            <li>• 今週は1度のみ受験可能</li>
          </ul>
          <button
            type="button"
            onClick={() => setPhase('taking')}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-8 text-base font-bold text-jigen-bg-dark shadow-gold-glow hover:scale-[1.02] transition-transform"
          >
            {isResume ? '続きから再開' : '受験を開始'} <ArrowRight className="h-5 w-5" />
          </button>
        </section>
        <Link href="/home" className="block text-center text-xs text-jigen-ink-mute underline underline-offset-4">
          ホームに戻る
        </Link>
      </main>
    );
  }

  // ============ 受験中 + 提出中 ============
  if ((phase === 'taking' || phase === 'submitting') && currentQ) {
    const answeredCount = Object.keys(answers).length;
    const allAnswered = answeredCount >= total;
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 text-jigen-ink">
        {/* 進捗 */}
        <div className="mb-4 flex items-baseline justify-between text-xs">
          <span className="font-bold text-jigen-gold">金曜小テスト</span>
          <span className="tabular-nums text-jigen-ink-soft">
            {currentIndex + 1} / {total}問
          </span>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-jigen-bg-panel-2">
          <div className="h-full bg-gold-gradient transition-[width]" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>

        {/* 問題本文 */}
        <section className="mb-4 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel">
          <p className="mb-2 inline-block rounded-full bg-jigen-bg-panel-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-gold">
            {currentQ.section} / {currentQ.sub_topic}
          </p>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-jigen-ink">
            {currentQ.body_md}
          </p>
        </section>

        {/* 選択肢 */}
        <section className="mb-6 space-y-2">
          {choices.map((c, i) => {
            const num = i + 1;
            const picked = currentAnswer === num;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(num)}
                disabled={phase === 'submitting'}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors',
                  picked
                    ? 'border-jigen-gold bg-jigen-gold/15 text-jigen-ink shadow-gold-glow'
                    : 'border-jigen-border-soft bg-jigen-bg-panel hover:border-jigen-gold/40',
                )}
              >
                <span className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                  picked ? 'bg-jigen-gold text-jigen-bg-dark' : 'bg-jigen-bg-panel-2 text-jigen-ink-mute',
                )}>{num}</span>
                <span className="flex-1 leading-relaxed">{c}</span>
              </button>
            );
          })}
        </section>

        {/* ナビゲーション */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={currentIndex === 0 || phase === 'submitting'}
            className="inline-flex h-11 items-center gap-1 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel px-4 text-sm font-semibold disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />前へ
          </button>
          {currentIndex < total - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              disabled={phase === 'submitting'}
              className="inline-flex h-11 items-center gap-1 rounded-xl bg-gold-gradient px-4 text-sm font-bold text-jigen-bg-dark shadow-gold-glow disabled:opacity-50"
            >
              次へ<ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!allAnswered || phase === 'submitting'}
              className="inline-flex h-11 items-center gap-1 rounded-xl bg-gold-gradient px-4 text-sm font-bold text-jigen-bg-dark shadow-gold-glow disabled:opacity-50"
            >
              {phase === 'submitting' ? <><Loader2 className="h-4 w-4 animate-spin" />提出中</> : <>提出する<Check className="h-4 w-4" /></>}
            </button>
          )}
        </div>

        {/* 中断 */}
        <button
          type="button"
          onClick={() => {
            if (confirm('受験を中断しますか? 進捗は自動保存されており、 後で続きから再開できます。')) {
              router.push('/home');
            }
          }}
          className="mt-4 block w-full text-center text-xs text-jigen-ink-mute underline underline-offset-4 hover:text-jigen-warning"
        >
          中断する
        </button>

        {errorMsg ? <p className="mt-3 text-center text-xs text-jigen-warning">{errorMsg}</p> : null}
      </main>
    );
  }

  return null;
}
