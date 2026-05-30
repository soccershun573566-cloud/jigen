'use client';

import Link from 'next/link';
import { X, User, MessageCircle, CheckCircle2, BookOpen, ListX, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import type { HomeV2Data } from '@/lib/mock/dashboard-data';

type Props = {
  data: HomeV2Data;
  /** モバイル時の開閉状態(lg+ では無視される) */
  open: boolean;
  onClose: () => void;
};

const ICONS = [User, MessageCircle, CheckCircle2, BookOpen, ListX] as const;

/**
 * ホームv2 サイドバー。
 * - lg 以上: 常時表示(左 288px)
 * - lg 未満: ドロワー(open prop で制御)
 */
export function HomeSidebar({ data, open, onClose }: Props) {
  return (
    <>
      {/* モバイル: オーバーレイ */}
      {open ? (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      {/* サイドバー本体 */}
      <aside
        aria-label="ナビゲーション"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform border-r border-jigen-border-soft bg-jigen-bg-panel transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-72 lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* 上: ブランド + 閉じるボタン(モバイル) */}
          <div className="flex items-center justify-between border-b border-jigen-border-soft px-5 py-4">
            <Link
              href="/home"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <span className="text-lg font-bold tracking-tight text-jigen-gold">
                ジゲン
              </span>
              <span className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">
                Tyrano Academy
              </span>
            </Link>
            <button
              type="button"
              aria-label="メニューを閉じる"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-jigen-ink-soft hover:bg-jigen-bg-panel-2 lg:hidden"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>

          {/* メニューリスト */}
          <nav className="flex-1 px-3 py-4">
            <ul className="flex flex-col gap-1">
              {data.sidebarItems.map((item, i) => {
                const Icon = ICONS[i] ?? BookOpen;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm text-jigen-ink-soft transition-colors hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
                    >
                      <Icon aria-hidden className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* 試験日と残り日数 */}
            <div className="mt-6 rounded-xl border border-jigen-border-soft bg-jigen-bg-dark p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-jigen-ink-mute">
                <Calendar aria-hidden className="h-3.5 w-3.5" />
                試験日
              </div>
              <p className="mt-1 text-base font-semibold text-jigen-ink">
                {data.examDate}
              </p>
              <div className="mt-3 text-xs uppercase tracking-wider text-jigen-ink-mute">
                残り日数
              </div>
              <p className="mt-1 text-3xl font-bold tabular-nums text-jigen-gold drop-shadow-[0_0_8px_rgba(245,196,65,0.35)]">
                {data.daysLeft}
                <span className="ml-1 text-sm font-medium text-jigen-ink-soft">日</span>
              </p>
            </div>
          </nav>

          {/* 下: 恐竜の成長記録 */}
          <div className="border-t border-jigen-border-soft p-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-jigen-ink-mute">
              恐竜の成長記録
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-jigen-gold/30 bg-gradient-to-br from-jigen-bg-panel-2 to-jigen-bg-dark p-3">
              <TiranoSensei size="sm" pose="study" mood="smile" rounded glow />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-jigen-ink">
                  ティラノ先生
                </p>
                <p className="text-xs text-jigen-ink-soft">
                  ヘルメット:{' '}
                  <span className="font-semibold text-jigen-gold-bright">
                    {data.growth.helmetRank}
                  </span>
                </p>
                <p className="text-xs text-jigen-ink-soft">
                  継続{' '}
                  <span className="font-bold tabular-nums text-jigen-gold-bright">
                    {data.growth.streakDays}
                  </span>
                  日
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
