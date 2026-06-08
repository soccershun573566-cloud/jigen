// /auth/post-signup — Google OAuth経由でβ申込時の中継ページ
// (β=1 の場合に Stripe Checkout に自動遷移する)
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

function PostSignupInner() {
  const params = useSearchParams();
  const isBeta = params.get('beta') === '1';
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!isBeta) {
        window.location.href = '/home';
        return;
      }
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ plan: 'beta_first' }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
        }
        window.location.href = data.url;
      } catch (e) {
        setError((e as Error).message || 'Stripe決済画面への遷移に失敗しました');
      }
    })();
  }, [isBeta]);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-jigen-ink">
      <TiranoSensei size="lg" glow />
      <div className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">β申込</p>
        {error ? (
          <>
            <p className="text-base font-semibold text-jigen-warning">{error}</p>
            <Link href="/home" className="text-sm text-jigen-gold underline">
              ホームに移動
            </Link>
          </>
        ) : (
          <>
            <p className="inline-flex items-center gap-2 text-sm text-jigen-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Stripe決済画面へ遷移しています...
            </p>
            <p className="text-xs text-jigen-ink-mute">この画面のまま少々お待ちください</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function PostSignupPage() {
  return (
    <Suspense fallback={null}>
      <PostSignupInner />
    </Suspense>
  );
}
