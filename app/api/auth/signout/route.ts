import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/auth/signout — ログアウト
export async function POST(req: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = new URL('/auth/login', req.url);
  return NextResponse.redirect(url, { status: 302 });
}
