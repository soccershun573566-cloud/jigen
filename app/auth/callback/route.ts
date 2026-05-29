import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase Auth コールバック(OAuth / メール確認のリダイレクト先)
// /auth/callback?code=xxx を受けて Cookie にセッションを書き込み /home へ
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
