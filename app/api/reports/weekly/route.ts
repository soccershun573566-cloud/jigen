import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/reports/weekly — 今週のレポート
export async function GET() {
  try {
    const user = await requireUser();
    void user;
    // TODO: 直近7日分の attempts + mastery 差分を集計
    return NextResponse.json({
      weekStart: '',
      weekEnd: '',
      totalAttempts: 0,
      totalCorrect: 0,
      daysActive: 0,
      subTopicProgress: [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
