/**
 * POST /api/onboarding
 * 初回質問(オンボーディング)の保存。
 * 完了後 users.onboarded_at が set される → アプリ側は完了状態を判定可能。
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Request = z.object({
  displayName: z.string().max(30).optional(),
  attemptHistory: z.enum(['first', 'failed_once', 'failed_multi']),
  weekdayMinutes: z.number().int().min(5).max(240),
  weekendMinutes: z.number().int().min(5).max(480),
  dailyTargetQuestions: z.number().int().min(1).max(500),
  studyStyle: z.enum(['self', 'cram_school', 'online']),
  strongSections: z.array(z.string()),
  weakSection: z.string(),
  notificationMorningAt: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notificationEnabled: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Request.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    const d = parsed.data;
    // displayName は空文字 or 未入力なら既存値を維持(COALESCE)
    const trimmedName = d.displayName?.trim();
    const displayName = trimmedName && trimmedName.length > 0 ? trimmedName : null;

    await db.execute(sql`
      update users set
        display_name = coalesce(${displayName}, display_name),
        attempt_history = ${d.attemptHistory},
        weekday_minutes = ${d.weekdayMinutes},
        weekend_minutes = ${d.weekendMinutes},
        daily_target_questions = ${d.dailyTargetQuestions},
        study_style = ${d.studyStyle},
        strong_sections = ${JSON.stringify(d.strongSections)}::jsonb,
        weak_section = ${d.weakSection},
        notification_morning_at = ${d.notificationMorningAt ?? '07:00'}::time,
        notification_enabled = ${d.notificationEnabled ?? true},
        onboarded_at = now(),
        updated_at = now()
      where id = ${user.id}
    `);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
