'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';

export function CancelButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleConfirm() {
    setPhase('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setPhase('done');
      router.refresh();
    } catch (e) {
      setErrorMsg((e as Error).message || '解約に失敗しました');
      setPhase('error');
    }
  }

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setPhase('confirm')}
        className="text-xs text-jigen-ink-soft underline-offset-4 hover:text-jigen-warning hover:underline"
      >
        次回更新を停止して解約する
      </button>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="rounded-lg border border-jigen-warning/40 bg-jigen-warning-soft/10 p-3">
        <p className="text-xs font-semibold text-jigen-ink">本当に解約しますか?</p>
        <p className="mt-1 text-[11px] text-jigen-ink-soft">
          現在の契約期間が終わるまで、 すべての機能をご利用いただけます。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1 rounded-md border border-jigen-warning/60 px-3 py-1.5 text-[11px] font-semibold text-jigen-warning hover:bg-jigen-warning/10"
          >
            <X aria-hidden className="h-3 w-3" />
            解約する
          </button>
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="rounded-md px-3 py-1.5 text-[11px] text-jigen-ink-soft hover:text-jigen-ink"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-jigen-ink-soft">
        <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
        解約処理中...
      </p>
    );
  }

  if (phase === 'done') {
    return (
      <p className="text-xs text-jigen-gold">
        解約手続きが完了しました。 期末までご利用いただけます。
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-jigen-warning" role="alert">
        {errorMsg}
      </p>
      <button
        type="button"
        onClick={() => setPhase('idle')}
        className="mt-2 text-[11px] text-jigen-ink-soft underline-offset-4 hover:underline"
      >
        もう一度試す
      </button>
    </div>
  );
}
