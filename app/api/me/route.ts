import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users, subscriptions, attempts } from '@/db/schema';
import { MeResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

// GET /api/me — プロファイル + サブスク + 累計学習日 + 連続日数(裏処理) + リカバリトークン
export async function GET() {
  try {
    const authUser = await requireUser();

    const [row] = await db
      .select({
        u: users,
        s: subscriptions,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'user not found' } },
        { status: 404 },
      );
    }

    // 累計学習日数: attempts の attempted_at を JST 日付に丸めて distinct count
    const rows = (await db.execute(sql`
      select count(distinct (date(${attempts.attemptedAt} at time zone 'Asia/Tokyo')))::int as count
      from ${attempts}
      where ${attempts.userId} = ${authUser.id}
    `)) as unknown as Array<{ count: number }>;
    const totalStudyDays = Number(rows[0]?.count ?? 0);

    const u = row.u;
    const s = row.s;
    const body: MeResponse = {
      id: u.id,
      email: u.email,
      displayName: u.displayName ?? null,
      weekdayMinutes: u.weekdayMinutes,
      weekendMinutes: u.weekendMinutes,
      targetExamDate: u.targetExamDate ?? null,
      streakCount: u.streakCount,
      totalStudyDays,
      recoveryTokens: u.recoveryTokens,
      busyModeUntil: u.busyModeUntil ?? null,
      subscription: {
        plan: (s?.plan ?? 'free') as 'monthly' | 'yearly' | 'free',
        status: (s?.status ?? 'free') as MeResponse['subscription']['status'],
        trialEndsAt: s?.trialEndsAt ? s.trialEndsAt.toISOString() : null,
        currentPeriodEnd: s?.currentPeriodEnd
          ? s.currentPeriodEnd.toISOString()
          : null,
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
