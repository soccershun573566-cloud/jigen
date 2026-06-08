/**
 * GET  /api/me/preferences  — 現在の学習設定を取得
 * PATCH /api/me/preferences — 部分更新
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PatchRequest = z.object({
  targetExamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dailyTargetQuestions: z.number().int().min(1).max(500).optional(),
  weekdayMinutes: z.number().int().min(5).max(240).optional(),
  weekendMinutes: z.number().int().min(5).max(480).optional(),
  notificationMorningAt: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notificationEnabled: z.boolean().optional(),
  strongSections: z.array(z.string()).optional(),
  weakSection: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const r = await db.execute(sql`
      select target_exam_date, daily_target_questions, weekday_minutes, weekend_minutes,
             notification_morning_at, notification_enabled,
             strong_sections, weak_section, attempt_history, study_style
      from users where id = ${user.id} limit 1
    `);
    const rows = (r as unknown as { rows?: unknown[] }).rows ?? (r as unknown as unknown[]);
    return NextResponse.json(rows[0] ?? null);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = PatchRequest.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    const d = parsed.data;

    // 部分更新のためカラム別に execute(指定されたものだけ更新)
    if (d.targetExamDate !== undefined) {
      await db.execute(sql`update users set target_exam_date = ${d.targetExamDate}::date, updated_at = now() where id = ${user.id}`);
    }
    if (d.dailyTargetQuestions !== undefined) {
      await db.execute(sql`update users set daily_target_questions = ${d.dailyTargetQuestions}, updated_at = now() where id = ${user.id}`);
    }
    if (d.weekdayMinutes !== undefined) {
      await db.execute(sql`update users set weekday_minutes = ${d.weekdayMinutes}, updated_at = now() where id = ${user.id}`);
    }
    if (d.weekendMinutes !== undefined) {
      await db.execute(sql`update users set weekend_minutes = ${d.weekendMinutes}, updated_at = now() where id = ${user.id}`);
    }
    if (d.notificationMorningAt !== undefined) {
      await db.execute(sql`update users set notification_morning_at = ${d.notificationMorningAt}::time, updated_at = now() where id = ${user.id}`);
    }
    if (d.notificationEnabled !== undefined) {
      await db.execute(sql`update users set notification_enabled = ${d.notificationEnabled}, updated_at = now() where id = ${user.id}`);
    }
    if (d.strongSections !== undefined) {
      await db.execute(sql`update users set strong_sections = ${JSON.stringify(d.strongSections)}::jsonb, updated_at = now() where id = ${user.id}`);
    }
    if (d.weakSection !== undefined) {
      await db.execute(sql`update users set weak_section = ${d.weakSection}, updated_at = now() where id = ${user.id}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { code: 'internal_error', message: (err as Error).message } }, { status: 500 });
  }
}
