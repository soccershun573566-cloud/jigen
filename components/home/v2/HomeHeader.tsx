'use client';

import { Menu } from 'lucide-react';
import type { HomeV2Data } from '@/lib/mock/dashboard-data';

type Props = {
  data: HomeV2Data;
  /** モバイル時のサイドバートグル */
  onMenuClick?: () => void;
};

/**
 * ホーム v2 上部ヘッダ。左: ハンバーガー(モバイル) / 中央: 試験名 / 右: 残り日数。
 * デスクトップ(lg+)では左に常時サイドバーがあるため、ハンバーガーは非表示。
 */
export function HomeHeader({ data, onMenuClick }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-jigen-border-soft bg-jigen-bg-dark/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        {/* 左: ハンバーガー(モバイル時) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="メニューを開く"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-jigen-ink hover:bg-jigen-bg-panel-2 lg:hidden"
          >
            <Menu aria-hidden className="h-6 w-6" />
          </button>
        </div>

        {/* 中央: 試験名 */}
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-base font-bold tracking-tight text-jigen-ink sm:text-lg">
            {data.examTitle}
          </h1>
        </div>

        {/* 右: 試験まで XX日 */}
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
            試験まで
          </p>
          <p className="text-xl font-extrabold tabular-nums leading-tight text-jigen-gold drop-shadow-[0_0_6px_rgba(245,196,65,0.4)] sm:text-2xl">
            {data.daysLeft}
            <span className="ml-0.5 text-xs font-medium text-jigen-ink-soft">日</span>
          </p>
        </div>
      </div>
    </header>
  );
}
