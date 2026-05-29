import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { CheckoutRequest } from '@/types/api';
import { getStripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY } from '@/lib/stripe/client';

// POST /api/billing/checkout — Stripe Checkout セッション作成
// 技術構築計画§6.1
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = CheckoutRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: 'plan required' } }, { status: 400 });
    }
    const priceId = parsed.data.plan === 'monthly' ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/home`,
      subscription_data: {
        metadata: { user_id: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
