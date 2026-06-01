// users.avatar_url カラム追加 + Supabase Storage 'avatars' bucket 作成
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  await sql`alter table users add column if not exists avatar_url text`;
  // storage.buckets は Supabase Storage 用の内部テーブル
  // 既存チェックして作成(failable なら無視)
  try {
    await sql`
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
      on conflict (id) do nothing
    `;
    console.log('OK: avatars bucket ensured');
  } catch (e) {
    console.log('NOTE: storage.buckets insert skipped:', (e).message);
  }
  // RLS: 認証ユーザーが自分のフォルダ {userId}/ 配下に upload/update/delete できる
  // 全員 read OK(public bucket)
  try {
    await sql`drop policy if exists "avatars_own_upload" on storage.objects`;
    await sql`drop policy if exists "avatars_own_update" on storage.objects`;
    await sql`drop policy if exists "avatars_own_delete" on storage.objects`;
    await sql`drop policy if exists "avatars_public_read" on storage.objects`;
    await sql`
      create policy "avatars_own_upload" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
    `;
    await sql`
      create policy "avatars_own_update" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
    `;
    await sql`
      create policy "avatars_own_delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
    `;
    await sql`
      create policy "avatars_public_read" on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'avatars')
    `;
    console.log('OK: avatars storage policies set');
  } catch (e) {
    console.log('NOTE: storage policies skipped:', (e).message);
  }
  console.log('done');
} finally {
  await sql.end();
}
