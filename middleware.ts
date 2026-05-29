import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// 技術構築計画§3.2
// /home /practice /review /mastery /weekly /settings /billing /diagnosis /notifications を保護。
// 未認証で /admin にアクセスすると 401(Basic 認証併用は別途)。
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // /admin は Basic 認証(MVP: 環境変数 ADMIN_BASIC_AUTH_*)
  if (path.startsWith('/questions') /* /admin route group なので URL は /questions */) {
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
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  return decoded.slice(0, idx) === expectedUser && decoded.slice(idx + 1) === expectedPass;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron|api/billing/webhook|.*\\..*).*)'],
};
