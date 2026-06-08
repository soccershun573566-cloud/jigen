'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, BarChart3, ClipboardCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

// 下部タブナビ(2026-05-30 大刷新: 旧「演習/伸びしろ」→ 新「学習履歴/分析/模試」)
// - 5タブ構成: ホーム / 学習履歴 / 分析 / 模試 / 設定
// - 配色: ダーク背景 + ゴールドアクセント(ホーム v2 と統一)
// - タップ領域 56px 以上(現場片手操作 + a11y)

type Tab = {
  href: string;
  label: string;
  Icon: typeof Home;
  /** path 判定: startsWith でハイライト */
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: '/home',
    label: 'ホーム',
    Icon: Home,
    match: (p) => p === '/home' || p === '/',
  },
  {
    href: '/review',
    label: '学習履歴',
    Icon: History,
    // 既存の /review(振り返り)を学習履歴の入口として暫定流用。後で専用画面に差し替え。
    match: (p) => p.startsWith('/review') || p.startsWith('/weekly'),
  },
  {
    href: '/mastery',
    label: '分析',
    Icon: BarChart3,
    match: (p) => p.startsWith('/mastery'),
  },
  {
    // 模試一覧ページ(初回50問模試 + 期間限定の直前模試)
    href: '/mock-exam',
    label: '模試',
    Icon: ClipboardCheck,
    match: (p) => p.startsWith('/mock-exam') || p.startsWith('/coming-soon/mock-exam'),
  },
  {
    href: '/settings',
    label: '設定',
    Icon: Settings,
    match: (p) => p.startsWith('/settings'),
  },
];

export function BottomTabNav() {
  const pathname = usePathname() ?? '/';

  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-jigen-border-soft bg-jigen-bg-dark/95 backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors',
                  active
                    ? 'text-jigen-gold'
                    : 'text-jigen-ink-mute hover:text-jigen-ink',
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    'h-5 w-5',
                    active && 'stroke-[2.25px] drop-shadow-[0_0_6px_rgba(245,196,65,0.45)]',
                  )}
                />
                <span className={cn(active && 'font-semibold')}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
