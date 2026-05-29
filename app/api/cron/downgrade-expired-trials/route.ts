import { NextResponse } from 'next/server';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { verifyCronSecret } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscriptions } from '@/db/schema';

// Cron: JST 00:30 — トライアル期限切れを free に降格
// 技術構築計画§6.3
// 条件: status='trialing' AND trial_ends_at < now() AND stripe_customer_id IS NULL
//       Checkout 通過済(stripe_customer_id 有)は触らない
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return jsonError(500, 'config_error', 'CRON_SECRET missing');
  }
  if (!verifyCronSecret(req)) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return jsonError(500, 'config_error', 'DATABASE_URL missing');
  }

  const now = new Date();

  try {
    const updated = await db
      .update(subscriptions)
      .set({
        status: 'free',
        plan: 'free',
        updatedAt: now,
      })
      .where(
        and(
          eq(subscriptions.status, 'trialing'),
          lt(subscriptions.trialEndsAt, now),
          isNull(subscriptions.stripeCustomerId),
        ),
      )
      .returning({ id: subscriptions.id, userId: subscriptions.userId });

    return NextResponse.json({
      ok: true,
      downgraded: updated.length,
      user_ids: updated.map((r) => r.userId),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cron/downgrade-expired-trials] error', err);
    return jsonError(500, 'internal_error', (err as Error).message);
  }
}

function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json({ error: { code, message } }, { status });
}
