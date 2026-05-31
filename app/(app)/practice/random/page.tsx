'use client';

// /practice/random — ランダム1問を取得して、その場で表示
// 高速化: リダイレクトせず、API 1回で取得 → そのまま PracticeRunner に渡す
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { Button } from '@/components/ui/button';
import { PracticeRunner, type RunnerQuestion } from '@/components/practice/PracticeRunner';
import type { PracticeNextResponse } from '@/types/api';

type Phase = 'loading' | 'error' | 'ready';

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

export default function PracticeRandomPage() {
  const searchParams = useSearchParams();
  const tQuery = searchParams.get('t'); // 「次の問題へ」遷移時のキャッシュバスト
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('読み込みに失敗しました');
  const [reloadKey, setReloadKey] = useState(0);
  const [question, setQuestion] = useState<RunnerQuestion | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');

    (async () => {
      try {
        const res = await fetch('/api/practice/next', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as PracticeNextResponse & {
          choices?: unknown;
          isNumeric?: boolean;
        };
        if (cancelled) return;
        if (!data?.id) throw new Error('問題が取得できませんでした');

        const choices = extractChoices(data.choices);
        setQuestion({
          id: data.id,
          year: data.year,
          qNumber: data.qNumber,
          section: data.section,
          subTopic: data.subTopic,
          bodyMd: data.bodyMd,
          choices,
          isNumeric: !!data.isNumeric,
        });
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        setErrorMessage((e as Error).message || '読み込みに失敗しました');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, tQuery]);

  if (phase === 'ready' && question) {
    return <PracticeRunner question={question} />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-jigen-ink">
      {phase === 'loading' ? (
        <>
          <div className="animate-pulse">
            <TiranoSensei size="lg" glow label="ティラノ先生が選んでいます" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
              Loading
            </p>
            <p className="text-sm text-jigen-ink-soft">
              次の問題を選んでいます...
            </p>
          </div>
          <span className="sr-only" aria-live="polite">
            問題を読み込み中です
          </span>
        </>
      ) : null}

      {phase === 'error' ? (
        <>
          <TiranoSensei size="md" label="ティラノ先生" />
          <div className="space-y-2 text-center">
            <p className="text-base font-semibold text-jigen-ink">
              読み込みに失敗しました
            </p>
            <p className="text-xs text-jigen-ink-mute">{errorMessage}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setReloadKey((k) => k + 1)}
              className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
            >
              再読み込み
            </Button>
            <Link
              href="/practice"
              className="text-center text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
            >
              演習トップに戻る
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
