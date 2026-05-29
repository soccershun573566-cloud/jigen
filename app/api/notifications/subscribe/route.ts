import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { PushSubscribeRequest } from '@/types/api';

// POST /api/notifications/subscribe — Web Push subscription 登録
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = PushSubscribeRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    void user;
    // TODO: push_subscriptions に upsert(endpoint unique)
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
