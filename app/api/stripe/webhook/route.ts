/**
 * POST /api/stripe/webhook — Stripe イベント受信
 *
 * 処理イベント:
 *   - checkout.session.completed: 初回チェックアウト完了 → users.stripe_customer_id 紐付け
 *   - customer.subscription.created: 新規サブスク作成 → subscriptions に upsert
 *   - customer.subscription.updated: 更新(プラン変更・期間延長等) → subscriptions 更新
 *   - customer.subscription.deleted: 解約 → subscriptions.status = 'canceled'
 *   - invoice.payment_succeeded: 課金成功 → subscriptions.status = 'active'
 *   - invoice.payment_failed: 課金失敗 → subscriptions.status = 'past_due'
 *
 * 冪等性: webhook_events テーブルで重複イベント排除
 * 署名検証: stripe.webhooks.constructEvent で必須
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
// Stripe webhook は raw body が必要なので edge runtime ではなく node.js runtime
export const runtime = 'nodejs';

type StripeSubscriptionLite = {
  id: string;
  status: Stripe.Subscription.Status;
  customer: string;
  current_period_end: number;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  items: { data: Array<{ price: { id: string; recurring: { interval: string } | null } }> };
  metadata: Record<string, string>;
};

function mapPlanFromInterval(interval: string | undefined): 'monthly' | 'yearly' | 'free' {
  if (interval === 'month') return 'monthly';
  if (interval === 'year') return 'yearly';
  return 'free';
}

function mapStatus(s: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'free' {
  if (s === 'trialing') return 'trialing';
  if (s === 'active') return 'active';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled';
  return 'free';
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const r = await db.execute(sql`
      select 1 from webhook_events where id = ${eventId} limit 1
    `);
    const rows = (r as unknown as { rows?: unknown[] }).rows ?? (r as unknown as unknown[]);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function markProcessed(eventId: string, type: string): Promise<void> {
  try {
    await db.execute(sql`
      insert into webhook_events (id, type, processed_at)
      values (${eventId}, ${type}, now())
      on conflict (id) do nothing
    `);
  } catch {
    /* noop */
  }
}

async function upsertSubscription(sub: StripeSubscriptionLite): Promise<void> {
  const userId = sub.metadata?.user_id ?? null;
  if (!userId) {
    // user_id 不明: customer から users を逆引きする実装は省略(現状は metadata 必須)
    return;
  }
  const interval = sub.items.data[0]?.price.recurring?.interval;
  const plan = mapPlanFromInterval(interval);
  const status = mapStatus(sub.status);
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  await db.execute(sql`
    insert into subscriptions (user_id, stripe_subscription_id, plan, status, trial_ends_at, current_period_end, created_at, updated_at)
    values (
      ${userId}::uuid,
      ${sub.id},
      ${plan}::plan_type,
      ${status}::subscription_status,
      ${trialEndsAt}::timestamptz,
      ${currentPeriodEnd}::timestamptz,
      now(),
      now()
    )
    on conflict (user_id) do update set
      stripe_subscription_id = excluded.stripe_subscription_id,
      plan = excluded.plan,
      status = excluded.status,
      trial_ends_at = excluded.trial_ends_at,
      current_period_end = excluded.current_period_end,
      updated_at = now()
  `);
}

async function setStatus(subscriptionId: string, status: ReturnType<typeof mapStatus>): Promise<void> {
  await db.execute(sql`
    update subscriptions
    set status = ${status}::subscription_status, updated_at = now()
    where stripe_subscription_id = ${subscriptionId}
  `);
}

async function setCanceledAt(subscriptionId: string): Promise<void> {
  await db.execute(sql`
    update subscriptions
    set status = 'canceled'::subscription_status, canceled_at = now(), updated_at = now()
    where stripe_subscription_id = ${subscriptionId}
  `);
}

async function attachCustomer(userId: string, customerId: string): Promise<void> {
  await db.execute(sql`
    insert into subscriptions (user_id, stripe_customer_id, plan, status, created_at, updated_at)
    values (${userId}::uuid, ${customerId}, 'free'::plan_type, 'trialing'::subscription_status, now(), now())
    on conflict (user_id) do update set
      stripe_customer_id = excluded.stripe_customer_id,
      updated_at = now()
  `);
}

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: { code: 'no_signature', message: 'stripe-signature missing' } }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: 'webhook_secret_missing', message: 'STRIPE_WEBHOOK_SECRET not set' } },
      { status: 500 },
    );
  }

  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'signature_failed', message: (err as Error).message } },
      { status: 400 },
    );
  }

  // 冪等性チェック
  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicated: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (userId && customerId) {
          await attachCustomer(userId, customerId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as StripeSubscriptionLite;
        await upsertSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSubscriptionLite;
        await setCanceledAt(sub.id);
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice & { subscription?: string };
        if (inv.subscription) await setStatus(inv.subscription as string, 'active');
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice & { subscription?: string };
        if (inv.subscription) await setStatus(inv.subscription as string, 'past_due');
        break;
      }
      default:
        // 未処理タイプはスルー
        break;
    }
    await markProcessed(event.id, event.type);
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'webhook_handler_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
