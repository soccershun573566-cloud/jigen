import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomTabNav } from '@/components/shared/BottomTabNav';

// 認証必須レイアウト
// 上部: ロゴ + 設定アイコン / 下部: タブナビ(ホーム/演習/伸びしろ/設定)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 pb-24">{children}</main>
      <BottomTabNav />
    </div>
  );
}
