import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';

// POST /api/tasks/[id]/complete — タスクを完了マーク
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    void user;
    // TODO: dailyTasks.completedAt = now()、ストリーク更新、PostHog イベント発火
    return NextResponse.json({ ok: true, id: params.id });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
