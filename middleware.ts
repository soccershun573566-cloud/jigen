import { NextResponse, type NextRequest } from 'next/server';

// MVP: middleware を一時無効化(認証チェックはクライアント側 + RLSで担保)
// Edge Runtime での @supabase/ssr 連携で500エラーが出るため、
// 安定するまで素通り。本番運用時に再有効化する。
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
