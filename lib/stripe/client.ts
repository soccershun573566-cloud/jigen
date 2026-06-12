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

// 環境変数名は STRIPE_PRICE_* に統一(以前 STRIPE_PRICE_ID_* だった旧名は廃止)
// Vercel 設定と一致させる
export const STRIPE_PRICE_MONTHLY =
  process.env.STRIPE_PRICE_MONTHLY ?? process.env.STRIPE_PRICE_ID_MONTHLY ?? '';
export const STRIPE_PRICE_YEARLY =
  process.env.STRIPE_PRICE_YEARLY ?? process.env.STRIPE_PRICE_ID_YEARLY ?? '';
export const STRIPE_PRICE_BETA =
  process.env.STRIPE_PRICE_BETA ?? process.env.STRIPE_PRICE_ID_BETA ?? ''; // 旧β月額・廃止予定
export const STRIPE_PRICE_BETA_FIRST =
  process.env.STRIPE_PRICE_BETA_FIRST ?? process.env.STRIPE_PRICE_ID_BETA_FIRST ?? '';
export const STRIPE_PRICE_BETA_SECOND_NEW =
  process.env.STRIPE_PRICE_BETA_SECOND_NEW ?? process.env.STRIPE_PRICE_ID_BETA_SECOND_NEW ?? '';
export const STRIPE_PRICE_BETA_SECOND_UPGRADE =
  process.env.STRIPE_PRICE_BETA_SECOND_UPGRADE ?? process.env.STRIPE_PRICE_ID_BETA_SECOND_UPGRADE ?? '';

// 買い切りプランの有効期限
export const BETA_FIRST_VALID_UNTIL = '2026-07-20T23:59:59+09:00';
export const BETA_SECOND_VALID_UNTIL = '2026-10-19T23:59:59+09:00';
