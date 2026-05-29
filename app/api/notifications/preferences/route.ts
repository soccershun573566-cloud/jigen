import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { NotificationPreferencesRequest } from '@/types/api';

// PATCH /api/notifications/preferences — 通知設定変更
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = NotificationPreferencesRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    void user;
    // TODO: users.notification_morning_at / notification_enabled 更新
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
