'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';

type Props = {
  initialEnabled: boolean;
  initialTime: string;
};

export function NotificationSettings({ initialEnabled, initialTime }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function save() {
    setSaving(true);
    setSaved(false);
    setErrorMsg('');
    try {
      const res = await fetch('/api/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notificationEnabled: enabled,
          notificationMorningAt: time,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErrorMsg((e as Error).message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5">
      {/* ON/OFF */}
      <label className="flex items-center justify-between gap-3 rounded-lg border border-jigen-border-soft bg-jigen-bg-dark p-3 cursor-pointer">
        <span className="text-sm font-medium text-jigen-ink">朝のリマインダー</span>
        <span className="relative">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-jigen-bg-panel-2 transition-colors checked:bg-jigen-gold"
          />
          <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-jigen-ink-mute transition-transform peer-checked:translate-x-4 peer-checked:bg-jigen-bg-dark"></span>
        </span>
      </label>

      {/* 時刻 */}
      {enabled ? (
        <div>
          <label className="mb-2 block text-xs font-bold text-jigen-gold">通知時刻</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink focus:border-jigen-gold focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-jigen-ink-mute">
            この時刻に「今日の問題」 学習リマインダーをお届けします。 ※実装中(完成次第)
          </p>
        </div>
      ) : null}

      {errorMsg ? <p className="text-xs text-jigen-warning">{errorMsg}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-gold-gradient text-sm font-bold text-jigen-bg-dark shadow-gold-glow disabled:opacity-50"
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" />保存中...</>
         : saved ? <><Check className="h-4 w-4" />保存しました</>
         : '通知設定を保存'}
      </button>
    </div>
  );
}
