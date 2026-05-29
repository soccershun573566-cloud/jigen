import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

// service_role キーを使うサーバー専用クライアント。
// 用途: Cron / Webhook / 管理API。RLS を貫通するので扱い厳重。
// このファイルを誤って `'use client'` 配下から import しないこと(import すると build エラー)。

let cached: ReturnType<typeof createSupabaseJsClient> | null = null;

export function createAdminClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE service role env missing');
  }
  cached = createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
