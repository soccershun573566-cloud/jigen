import Stripe from 'stripe';

// サーバー専用 Stripe クライアント
// 技術構築計画§6
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  cached = new Stripe(key, {
    apiVersion: '2024-06-20',
    typescript: true,
  });
  return cached;
}

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY ?? '';
export const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY ?? '';
export const STRIPE_PRICE_BETA = process.env.STRIPE_PRICE_ID_BETA ?? '';
