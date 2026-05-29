import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/mastery — 弱点ダッシュボード(BKT mastery_p)
export async function GET() {
  try {
    const user = await requireUser();
    void user;
    // TODO: db.select().from(masteryProfiles).where(eq(userId, user.id)).orderBy(asc(masteryP))
    return NextResponse.json({ items: [] });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
