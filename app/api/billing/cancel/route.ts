import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { getStripe } from '@/lib/stripe/client';

// POST /api/billing/cancel — 解約(期末まで利用可)
// 技術構築計画§6.4
export async function POST() {
  try {
    const user = await requireUser();
    void user;
    // TODO: db から stripe_subscription_id を取得
    const stripeSubscriptionId = ''; // TODO
    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: { code: 'no_subscription', message: '解約対象なし' } }, { status: 400 });
    }
    await getStripe().subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
