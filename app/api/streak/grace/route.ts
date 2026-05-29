import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';

// POST /api/streak/grace — リカバリトークンを使ってストリーク維持
// ユウ§4.1
export async function POST() {
  try {
    const user = await requireUser();
    void user;
    // TODO:
    //   1) recovery_tokens > 0 を確認
    //   2) streak_grace_used_at = today、recovery_tokens--
    //   3) streak_count を維持
    return NextResponse.json({ usedAt: new Date().toISOString(), recoveryTokensRemaining: 2 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
