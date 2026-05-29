'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

// 下部タブナビ(ユウ§3: ホーム / 演習 / 弱点 / 設定)
// - 現在位置をハイライト
// - タップ領域 56px 以上(現場片手操作 + a11y)
// - 「振り返り」はホームと演習完了動線で出すため、タブからは外す

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
    href: '/practice',
    label: '演習',
    Icon: BookOpen,
    match: (p) => p.startsWith('/practice'),
  },
  {
    href: '/mastery',
    label: '伸びしろ',
    Icon: Sparkles,
    match: (p) => p.startsWith('/mastery'),
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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-xs',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  aria-hidden
                  className={cn('h-5 w-5', active && 'stroke-[2.25px]')}
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
