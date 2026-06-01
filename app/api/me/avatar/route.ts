/**
 * POST /api/me/avatar
 *   - multipart/form-data で画像をアップロード → Supabase Storage 'avatars' bucket に保存
 *   - users.avatar_url に public URL を保存
 *   - ファイルパス: {userId}/avatar-{timestamp}.{ext}
 * DELETE /api/me/avatar
 *   - users.avatar_url を null に戻す(Storage 上のファイルは残してOK)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'no_file', message: 'ファイルが指定されていません' } },
        { status: 400 },
      );
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: { code: 'bad_type', message: 'PNG/JPG/WEBP/GIF のみ対応です' } },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: { code: 'too_large', message: '5MB以下にしてください' } },
        { status: 400 },
      );
    }

    const ext = (file.type.split('/')[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg');
    const ts = Date.now();
    const path = `${user.id}/avatar-${ts}.${ext}`;

    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });
    if (upErr) {
      return NextResponse.json(
        { error: { code: 'upload_failed', message: upErr.message } },
        { status: 500 },
      );
    }
    const { data: pub } = admin.storage.from('avatars').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    await db.execute(sql`
      update users set avatar_url = ${publicUrl}, updated_at = now()
      where id = ${user.id}
    `);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await db.execute(sql`
      update users set avatar_url = null, updated_at = now() where id = ${user.id}
    `);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
