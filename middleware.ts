import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// 技術構築計画§3.2
// /home /practice /review /mastery /weekly /settings /billing /diagnosis /notifications を保護。
// Edge Runtime 対応のため Buffer ではなく atob を使用。
// Supabase 呼び出しは try/catch でラップし、失敗時もページ表示は維持(MVP方針)。
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const path = req.nextUrl.pathname;
  const protectedPrefixes = [
    '/home',
    '/practice',
    '/review',
    '/mastery',
    '/weekly',
    '/settings',
    '/billing',
    '/diagnosis',
    '/notifications',
  ];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));
  const isAuthPage = path.startsWith('/auth/login') || path.startsWith('/auth/signup');

  // Supabase 環境変数が未設定なら認証チェックをスキップ(LPは見える)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && (isProtected || isAuthPage)) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isProtected && !user) {
        const url = req.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('next', path);
        return NextResponse.redirect(url);
      }
      if (isAuthPage && user) {
        const url = req.nextUrl.clone();
        url.pathname = '/home';
        return NextResponse.redirect(url);
      }
    } catch (e) {
      // Supabase 呼び出し失敗時はそのまま素通り(MVPは表示優先)
      console.error('[middleware] supabase auth check failed:', e);
    }
  }

  // /admin (route group 経由で URL は /questions) Basic 認証
  // Edge Runtime のため Buffer ではなく atob を使う
  if (path.startsWith('/questions')) {
    const expectedUser = process.env.ADMIN_BASIC_AUTH_USER;
    const expectedPass = process.env.ADMIN_BASIC_AUTH_PASS;
    if (expectedUser && expectedPass) {
      const auth = req.headers.get('authorization');
      const ok = auth && checkBasicAuth(auth, expectedUser, expectedPass);
      if (!ok) {
        return new NextResponse('Auth required', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="jigen-admin"' },
        });
      }
    }
  }

  return res;
}

function checkBasicAuth(header: string, expectedUser: string, expectedPass: string): boolean {
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  // Edge Runtime 対応: Buffer ではなく atob
  let decoded = '';
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  return decoded.slice(0, idx) === expectedUser && decoded.slice(idx + 1) === expectedPass;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron|api/billing/webhook|api/ai|api/attempts|api/tasks|api/diagnosis|api/me|api/mastery|api/reports|api/notifications|api/streak|api/questions|api/auth|.*\\..*).*)',
  ],
};
