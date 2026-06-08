'use client';

import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

type Plan = 'monthly' | 'yearly' | 'beta';

export function CheckoutButton({ plan, label }: { plan: Plan; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleClick() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: { message: string } };
      if (!res.ok || !data.url) {
        throw new Error(data.error?.message ?? `HTTP ${res.status}`);
      }
      // Stripe Checkout 画面へ遷移
      window.location.href = data.url;
    } catch (e) {
      setErrorMsg((e as Error).message || 'チェックアウトに失敗しました');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 text-sm font-bold text-jigen-bg-dark shadow-gold-glow transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100'
        }
      >
        {loading ? (
          <>
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            遷移中...
          </>
        ) : (
          <>
            {label ?? (plan === 'monthly' ? '月額プランで始める' : plan === 'yearly' ? '年額プランで始める' : 'β枠に申し込む')}
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
      {errorMsg ? (
        <p className="mt-2 text-xs text-jigen-warning" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
