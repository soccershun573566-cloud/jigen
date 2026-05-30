'use client';

import { useState, type ReactNode } from 'react';
import { HomeHeader } from './HomeHeader';
import { HomeSidebar } from './HomeSidebar';
import type { HomeV2Data } from '@/lib/mock/dashboard-data';

type Props = {
  data: HomeV2Data;
  children: ReactNode;
};

/**
 * ホーム v2 のレイアウトシェル。
 * - lg+: 左にサイドバー固定、右にメイン
 * - lg 未満: ヘッダのハンバーガーでサイドバーを開閉
 */
export function HomeShell({ data, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-jigen-bg-dark text-jigen-ink">
      <div className="lg:flex">
        <HomeSidebar
          data={data}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <HomeHeader data={data} onMenuClick={() => setSidebarOpen(true)} />
          <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
