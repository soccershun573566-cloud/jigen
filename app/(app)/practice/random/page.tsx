'use client';

// S06 /practice/random — ランダムに1問引いて /practice/{id} へ replace
// CEO指示(2026-05-31): 実APIで動かす。ハル実装の GET /api/practice/next を叩く。
// ローディング中はティラノ先生 + 「問題を選んでいます...」表示。
// 失敗時は「再読み込み」CTA。
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { Button } from '@/components/ui/button';
import type { PracticeNextResponse } from '@/types/api';

type Phase = 'loading' | 'error' | 'done';

export default function PracticeRandomPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('読み込みに失敗しました');
  const [reloadKey, setReloadKey] = useState(0);

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
        const data = (await res.json()) as PracticeNextResponse;
        if (cancelled) return;
        if (!data?.id) throw new Error('問題が取得できませんでした');
        setPhase('done');
        router.replace(`/practice/${data.id}`);
      } catch (e) {
        if (cancelled) return;
        setErrorMessage((e as Error).message || '読み込みに失敗しました');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, reloadKey]);

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
              ティラノ先生が問題を選んでいます...
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

      {phase === 'done' ? (
        <p className="text-sm text-jigen-ink-mute">移動中...</p>
      ) : null}
    </div>
  );
}
