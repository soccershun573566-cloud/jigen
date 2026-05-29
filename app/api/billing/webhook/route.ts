import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

// POST /api/billing/webhook — Stripe Webhook 受信
// 技術構築計画§6.2
// Vercel では raw body を取得するために、route segment config で body parser を切る必要あり
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Bad signature: ${(err as Error).message}`, { status: 400 });
  }

  // TODO: webhook_events テーブルで冪等性チェック
  // TODO: event.type ごとに subscriptions 更新
  switch (event.type) {
    case 'checkout.session.completed':
      // TODO: status='active', plan, stripe_customer_id, stripe_subscription_id 反映
      break;
    case 'customer.subscription.updated':
      // TODO: current_period_end / status 更新
      break;
    case 'customer.subscription.deleted':
      // TODO: status='canceled', canceled_at 更新
      break;
    case 'invoice.payment_failed':
      // TODO: status='past_due'、Resend で通知
      break;
    case 'invoice.payment_succeeded':
      // TODO: current_period_end 更新
      break;
    default:
      // 未対応イベントは ignore
      break;
  }

  return NextResponse.json({ received: true });
}
