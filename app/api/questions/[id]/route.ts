import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/questions/[id] — 問題本文取得(回答前は answer / explanation を返さない)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    void user;
    // TODO: db.select().from(questions).where(eq(id, params.id))
    return NextResponse.json({
      id: params.id,
      year: 2024,
      qNumber: 1,
      section: '建築学一般',
      subTopic: 'placeholder',
      difficulty: 0.5,
      bodyMd: 'TODO',
      choices: { type: 'choice', items: [] },
      isNumeric: false,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
