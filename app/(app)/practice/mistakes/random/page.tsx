'use client';

// /practice/mistakes/random — 間違えリストからランダム1問取得して表示
// - source='mistakes' で PracticeRunner に渡す(ホーム進捗にカウントされない)
// - 次の問題へは「間違えリストから次の問題」
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { Button } from '@/components/ui/button';
import { PracticeRunner, type RunnerQuestion } from '@/components/practice/PracticeRunner';

type Phase = 'loading' | 'error' | 'ready' | 'done';

type CachedQuestion = {
  id: string;
  year: number;
  qNumber: number;
  section: string;
  subTopic: string;
  bodyMd: string;
  choices: unknown;
  isNumeric?: boolean;
};

function extractChoices(choicesRaw: unknown): string[] {
  if (Array.isArray(choicesRaw)) {
    return (choicesRaw as unknown[]).filter((x) => typeof x === 'string') as string[];
  }
  if (choicesRaw && typeof choicesRaw === 'object') {
    const items = (choicesRaw as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return (items as unknown[]).filter((x) => typeof x === 'string') as string[];
    }
  }
  return [];
}

function buildRunnerQuestion(data: CachedQuestion): RunnerQuestion {
  return {
    id: data.id,
    year: data.year,
    qNumber: data.qNumber,
    section: data.section,
    subTopic: data.subTopic,
    bodyMd: data.bodyMd,
    choices: extractChoices(data.choices),
    isNumeric: !!data.isNumeric,
  };
}

async function fetchOne(): Promise<CachedQuestion | null> {
  const res = await fetch('/api/practice/next-mistake', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as CachedQuestion;
  return data?.id ? data : null;
}

export default function PracticeMistakesRandomPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('読み込みに失敗しました');
  const [reloadKey, setReloadKey] = useState(0);
  const [question, setQuestion] = useState<RunnerQuestion | null>(null);
  const loadingRef = useRef(false);
  // 【高速化】 1問先読み: 現在の問題を表示中に、 裏で次の1問を取得しておく
  // → 「次の問題へ」 タップ時に RTT待ち時間ゼロ
  const prefetchedRef = useRef<CachedQuestion | null>(null);

  function startPrefetch() {
    if (prefetchedRef.current) return; // 既にプリフェッチ済
    fetchOne()
      .then((q) => {
        if (q) prefetchedRef.current = q;
      })
      .catch(() => { /* ignore */ });
  }

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setQuestion(null);

    (async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const next = await fetchOne();
        if (cancelled) return;
        if (!next) {
          setPhase('done');
          return;
        }
        setQuestion(buildRunnerQuestion(next));
        setPhase('ready');
        // 1問先読み開始
        startPrefetch();
      } catch (e) {
        if (cancelled) return;
        setErrorMessage((e as Error).message || '読み込みに失敗しました');
        setPhase('error');
      } finally {
        loadingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleNextInline() {
    // プリフェッチ済の問題があれば即座に表示(RTT待ちなし)
    let next = prefetchedRef.current;
    prefetchedRef.current = null;
    if (!next) {
      next = await fetchOne();
    }
    if (next) {
      setQuestion(buildRunnerQuestion(next));
      // 次のプリフェッチ開始
      startPrefetch();
    } else {
      setQuestion(null);
      setPhase('done');
    }
  }

  if (phase === 'ready' && question) {
    return (
      <PracticeRunner
        key={question.id}
        question={question}
        source="mistakes"
        onNext={handleNextInline}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-jigen-ink">
      {phase === 'loading' ? (
        <>
          <div className="animate-pulse">
            <TiranoSensei size="lg" glow label="ティラノ先生" />
          </div>
          <p className="text-sm text-jigen-ink-soft">復習問題を選んでいます...</p>
        </>
      ) : null}

      {phase === 'done' ? (
        <>
          <TiranoSensei size="lg" glow />
          <div className="space-y-2 text-center">
            <p className="text-base font-bold text-jigen-ink">復習が完了しました</p>
            <p className="text-xs text-jigen-ink-soft">
              現在、復習対象の間違え問題はありません。
              <br />
              引き続き「今日の問題」に取り組みましょう。
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/practice/random"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gold-gradient px-6 text-sm font-bold text-jigen-bg-dark shadow-gold-glow hover:scale-[1.02] transition-transform"
            >
              今日の問題を解く
            </Link>
            <Link
              href="/home"
              className="inline-flex h-12 items-center justify-center text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
            >
              ホームへ
            </Link>
          </div>
        </>
      ) : null}

      {phase === 'error' ? (
        <>
          <TiranoSensei size="md" />
          <div className="space-y-2 text-center">
            <p className="text-base font-semibold text-jigen-ink">読み込みに失敗しました</p>
            <p className="text-xs text-jigen-ink-mute">{errorMessage}</p>
          </div>
          <Button
            onClick={() => setReloadKey((k) => k + 1)}
            className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
          >
            再読み込み
          </Button>
        </>
      ) : null}
    </div>
  );
}
