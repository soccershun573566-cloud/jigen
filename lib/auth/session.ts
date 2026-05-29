import { createClient } from '@/lib/supabase/server';

/** Server Component / Route Handler でユーザーを取得する補助 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** 未認証なら例外。API Route で使う想定 */
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
