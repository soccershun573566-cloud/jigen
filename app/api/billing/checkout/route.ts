/**
 * POST /api/billing/checkout — Stripe Checkout セッション作成
 *
 * プラン:
 *   - monthly:           通常月額¥2,980 + 7日無料(サブスク)
 *   - yearly:            通常年額¥24,800 + 7日無料(サブスク)
 *   - beta_first:        β1次 ¥980 買い切り(2026/07/20まで有効)
 *   - beta_second_new:   β2次 ¥1,480 買い切り(2026/10/19まで有効・新規)
 *   - beta_second_upgrade: β2次 ¥980 買い切り(β1次からのアップグレード)
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  getStripe,
  STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY,
  STRIPE_PRICE_BETA_FIRST, STRIPE_PRICE_BETA_SECOND_NEW, STRIPE_PRICE_BETA_SECOND_UPGRADE,
  BETA_FIRST_VALID_UNTIL, BETA_SECOND_VALID_UNTIL,
} from '@/lib/stripe/client';

const CheckoutRequest = z.object({
  plan: z.enum(['monthly', 'yearly', 'beta_first', 'beta_second_new', 'beta_second_upgrade']),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = CheckoutRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: 'plan required' } }, { status: 400 });
    }
    const plan = parsed.data.plan;

    // 買い切りプランは重複購入禁止
    if (plan === 'beta_first') {
      const r = await db.execute(sql`
        select valid_until from licenses
        where user_id = ${user.id}::uuid
          and plan_type = 'beta_first'
          and valid_until > now()
        limit 1
      `);
      const rows = (r as unknown as { rows?: Array<{ valid_until: string }> }).rows
        ?? (r as unknown as Array<{ valid_until: string }>);
      if (rows && rows.length > 0) {
        return NextResponse.json({
          error: { code: 'already_purchased', message: `β1次プランは既にご購入済みです(有効期限: ${rows[0].valid_until})` }
        }, { status: 409 });
      }
    }
    if (plan === 'beta_second_new' || plan === 'beta_second_upgrade') {
      const r = await db.execute(sql`
        select valid_until from licenses
        where user_id = ${user.id}::uuid
          and plan_type in ('beta_second_new', 'beta_second_upgrade')
          and valid_until > now()
        limit 1
      `);
      const rows = (r as unknown as { rows?: Array<{ valid_until: string }> }).rows
        ?? (r as unknown as Array<{ valid_until: string }>);
      if (rows && rows.length > 0) {
        return NextResponse.json({
          error: { code: 'already_purchased', message: `β2次プランは既にご購入済みです(有効期限: ${rows[0].valid_until})` }
        }, { status: 409 });
      }
    }

    // β2次アップグレードは β1次ライセンス保有者のみ
    if (plan === 'beta_second_upgrade') {
      const r = await db.execute(sql`
        select 1 from licenses
        where user_id = ${user.id}::uuid
          and plan_type = 'beta_first'
          and valid_until > now()
        limit 1
      `);
      const rows = (r as unknown as { rows?: unknown[] }).rows ?? (r as unknown as unknown[]);
      if (!rows || rows.length === 0) {
        return NextResponse.json({
          error: { code: 'no_beta_first', message: 'β1次プランの購入履歴がありません。 新規の場合は ¥1,480 プランをご選択ください' }
        }, { status: 403 });
      }
    }

    // サブスクは既存活性のものがあれば重複拒否
    if (plan === 'monthly' || plan === 'yearly') {
      const r = await db.execute(sql`
        select status from subscriptions
        where user_id = ${user.id}::uuid
          and status in ('trialing', 'active', 'past_due')
        limit 1
      `);
      const rows = (r as unknown as { rows?: Array<{ status: string }> }).rows
        ?? (r as unknown as Array<{ status: string }>);
      if (rows && rows.length > 0) {
        return NextResponse.json({
          error: { code: 'already_subscribed', message: '既に有効なサブスクリプションがあります。 解約後に再度お試しください' }
        }, { status: 409 });
      }
    }

    const isSubscription = plan === 'monthly' || plan === 'yearly';
    const priceId =
      plan === 'monthly' ? STRIPE_PRICE_MONTHLY
      : plan === 'yearly' ? STRIPE_PRICE_YEARLY
      : plan === 'beta_first' ? STRIPE_PRICE_BETA_FIRST
      : plan === 'beta_second_new' ? STRIPE_PRICE_BETA_SECOND_NEW
      : STRIPE_PRICE_BETA_SECOND_UPGRADE;
    if (!priceId) {
      return NextResponse.json({ error: { code: 'price_not_configured', message: 'price ID is not configured' } }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const isBeta = plan.startsWith('beta_');
    const successUrl = `${appUrl}/billing?status=success`;
    const cancelUrl = isBeta ? `${appUrl}/beta` : `${appUrl}/home`;

    let session;
    if (isSubscription) {
      session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        // payment_method_types を指定しないと、 Stripeダッシュボードで有効化した
        // 全決済手段(クレカ + Apple Pay + Google Pay + Link) が自動で表示される
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: user.id,
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: 7,
          metadata: { user_id: user.id, plan },
        },
        payment_method_collection: 'always',
        allow_promotion_codes: true,
      });
    } else {
      // 買い切り(one-time payment)
      const validUntil = (plan === 'beta_first') ? BETA_FIRST_VALID_UNTIL : BETA_SECOND_VALID_UNTIL;
      session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        // payment_method_types を指定しないと、 Stripeダッシュボードで有効化した
        // 全決済手段(クレカ + Apple Pay + Google Pay + Link) が自動で表示される
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: user.id,
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_intent_data: {
          metadata: { user_id: user.id, plan, valid_until: validUntil },
        },
        metadata: { user_id: user.id, plan, valid_until: validUntil },
        allow_promotion_codes: true,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
