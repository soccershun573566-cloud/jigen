'use client';

import { useEffect, useState } from 'react';

type Props = {
  /** ターゲット時刻(ISO形式) */
  targetISO: string;
  /** 表示モード */
  mode: 'large' | 'compact';
  /** 上ラベル */
  label?: string;
  /** 残り0になった時のハンドラ */
  onExpire?: () => void;
};

function diff(targetMs: number): { d: number; h: number; m: number; s: number; expired: boolean } {
  const ms = Math.max(0, targetMs - Date.now());
  if (ms === 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s, expired: false };
}

export function LaunchCountdown({ targetISO, mode, label, onExpire }: Props) {
  const targetMs = new Date(targetISO).getTime();
  const [t, setT] = useState(() => diff(targetMs));

  useEffect(() => {
    const tick = () => {
      const next = diff(targetMs);
      setT(next);
      if (next.expired) {
        onExpire?.();
        // 数秒待ってからリロード(全員のページが自動で次フェーズへ)
        setTimeout(() => window.location.reload(), 2000);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs, onExpire]);

  if (mode === 'large') {
    return (
      <div className="mb-6 rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-6 text-center shadow-gold-glow">
        {label ? (
          <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
            {label}
          </p>
        ) : null}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <Box value={t.d} unit="日" />
          <Box value={t.h} unit="時間" />
          <Box value={t.m} unit="分" />
          <Box value={t.s} unit="秒" pulse />
        </div>
      </div>
    );
  }

  // compact
  return (
    <span className="inline-flex items-baseline gap-1 text-sm font-bold tabular-nums text-jigen-gold">
      <span>残り</span>
      <span className="text-base">{t.d > 0 ? `${t.d}日 ` : ''}{String(t.h).padStart(2, '0')}:{String(t.m).padStart(2, '0')}:{String(t.s).padStart(2, '0')}</span>
    </span>
  );
}

function Box({ value, unit, pulse }: { value: number; unit: string; pulse?: boolean }) {
  return (
    <div className="rounded-xl border border-jigen-gold/40 bg-jigen-bg-dark/60 p-3 sm:p-4">
      <p className={`text-3xl font-extrabold tabular-nums text-jigen-gold drop-shadow-[0_0_8px_rgba(245,196,65,0.5)] sm:text-5xl ${pulse ? 'animate-pulse' : ''}`}>
        {String(value).padStart(2, '0')}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-jigen-ink-soft">{unit}</p>
    </div>
  );
}
