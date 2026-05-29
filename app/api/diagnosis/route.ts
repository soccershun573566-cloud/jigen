import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';

// POST /api/diagnosis — 現状診断(S03-S04)結果保存
// TODO(ハル): 診断結果から mastery_profiles の初期値を埋める
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    void user;
    void body;
    // TODO: 診断回答から各 sub_topic の初期 mastery_p を BKT pL0 ベースで補正設定
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
