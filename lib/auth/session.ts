import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Server Component / Route Handler でユーザーを取得する補助
 * 【高速化】 React.cache() で同一リクエスト内なら 1 回だけ Supabase Auth に問い合わせ
 *   - layout / page / nested server component が複数回呼んでも Auth call は 1 回
 *   - 同一レンダー内では結果が deduped される
 *   - リクエスト境界を越えると新規に解決される(安全)
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** 未認証なら例外。API Route で使う想定(getCurrentUser のキャッシュ越し) */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return user;
}

/** Cron / Webhook 認証ヘッダ検証 */
export function verifyCronSecret(req: Request): boolean {
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}
