/**
 * POST /api/billing/cancel — 解約(期末まで利用可)
 * - subscriptions テーブルから stripe_subscription_id を取得
 * - Stripe API で cancel_at_period_end = true をセット
 * - 顧客はそのまま期末まで利用可能、 翌期から課金停止
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { getStripe } from '@/lib/stripe/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await requireUser();

    const r = await db.execute(sql`
      select stripe_subscription_id from subscriptions
      where user_id = ${user.id}::uuid
        and stripe_subscription_id is not null
        and status in ('trialing', 'active', 'past_due')
      limit 1
    `);
    const rows = (r as unknown as { rows?: Array<{ stripe_subscription_id: string }> }).rows
      ?? (r as unknown as Array<{ stripe_subscription_id: string }>);
    const sid = rows?.[0]?.stripe_subscription_id;
    if (!sid) {
      return NextResponse.json(
        { error: { code: 'no_subscription', message: '解約対象なし' } },
        { status: 400 },
      );
    }

    await getStripe().subscriptions.update(sid, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
