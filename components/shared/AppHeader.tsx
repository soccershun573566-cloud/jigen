'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

// 認証必須ルートのヘッダ。タブと役割を分離するため上部は最小情報のみ。
// 2026-05-30: ホーム v2(ダーク+ゴールド)は独自ヘッダを持つため、/home では非表示。
export function AppHeader() {
  const pathname = usePathname() ?? '/';
  if (pathname === '/home' || pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/home" className="text-base font-bold tracking-tight">
          ジゲン
        </Link>
        <Link
          href="/settings"
          aria-label="設定"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Settings aria-hidden className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
