import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ルート "/" の所有はここ。
// 認証済み → /home、未認証 → /lp(LP)
export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }
  redirect('/lp');
}
