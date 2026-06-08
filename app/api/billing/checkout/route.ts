import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { CheckoutRequest } from '@/types/api';
import { getStripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, STRIPE_PRICE_BETA } from '@/lib/stripe/client';

// POST /api/billing/checkout — Stripe Checkout セッション作成
// プラン:
//   - monthly: 通常月額(¥2,980)+ 7日無料トライアル
//   - yearly:  通常年額(¥24,800)+ 7日無料トライアル
//   - beta:    β限定月額(¥980)+ **無料期間なし・即課金**(直前駆け込み層向け)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = CheckoutRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: 'plan required' } }, { status: 400 });
    }
    const plan = parsed.data.plan;
    const priceId =
      plan === 'beta' ? STRIPE_PRICE_BETA
      : plan === 'monthly' ? STRIPE_PRICE_MONTHLY
      : STRIPE_PRICE_YEARLY;
    if (!priceId) {
      return NextResponse.json({ error: { code: 'price_not_configured', message: 'price ID is not configured' } }, { status: 500 });
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // β版は無料期間なし、 それ以外は7日無料
    const subscriptionData: Record<string, unknown> = {
      metadata: { user_id: user.id, plan },
    };
    if (plan !== 'beta') {
      subscriptionData.trial_period_days = 7;
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: plan === 'beta' ? `${appUrl}/beta` : `${appUrl}/home`,
      subscription_data: subscriptionData as any,
      payment_method_collection: 'always',
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
