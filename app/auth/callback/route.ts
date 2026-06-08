import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase Auth コールバック(OAuth / メール確認のリダイレクト先)
// /auth/callback?code=xxx を受けて Cookie にセッションを書き込み /home へ
// β=1 の場合は /auth/post-signup?beta=1 にリダイレクトしてStripe checkoutへ
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isBeta = searchParams.get('beta') === '1';
  const next = searchParams.get('next') ?? (isBeta ? '/auth/post-signup?beta=1' : '/home');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
