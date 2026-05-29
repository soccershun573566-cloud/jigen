import { NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  dailyTasks,
  masteryProfiles,
  attempts,
  questions,
  users,
} from '@/db/schema';
import { buildTaskForUser, type MasteryInput } from '@/lib/learning/task-generator';

export const dynamic = 'force-dynamic';

// GET /api/tasks/today
// 1) 当日タスクを検索 → あればそのまま返す
// 2) 無ければ buildTaskForUser でオンデマンド生成 → INSERT → 返却
export async function GET() {
  try {
    const user = await requireUser();
    const todayJst = formatJstDate(new Date());

    const [existing] = await db
      .select()
      .from(dailyTasks)
      .where(
        and(eq(dailyTasks.userId, user.id), eq(dailyTasks.targetDate, todayJst)),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(serialize(existing));
    }

    // ユーザー設定取得
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!u) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'user row missing' } },
        { status: 404 },
      );
    }

    // 必要データを並列取得
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [mastery, recentAttempts, pool] = await Promise.all([
      db.select().from(masteryProfiles).where(eq(masteryProfiles.userId, user.id)),
      db
        .select()
        .from(attempts)
        .where(
          and(
            eq(attempts.userId, user.id),
            gte(attempts.attemptedAt, sevenDaysAgo),
          ),
        ),
      db.select().from(questions).where(eq(questions.published, true)),
    ]);

    // attempts に紐づく Question の sub_topic / isNumeric を埋めるために結合 map を作る
    const qMap = new Map(pool.map((q) => [q.id, q]));

    const masteryInput: MasteryInput[] = mastery.map((m) => ({
      subTopic: m.subTopic,
      masteryP: m.masteryP,
      nextReviewAt: m.nextReviewAt,
      lastPracticedAt: m.lastPracticedAt,
      attemptsCount: m.attemptsCount,
    }));

    const recentInput = recentAttempts.map((a) => {
      const q = qMap.get(a.questionId);
      return {
        questionId: a.questionId,
        subTopic: q?.subTopic ?? '',
        isCorrect: a.isCorrect,
        isNearMiss: a.isNearMiss,
        isNumeric: q?.isNumeric ?? false,
        attemptedAt: a.attemptedAt,
      };
    });

    const isWeekend = isWeekendJst(now);
    const isBusyMode = !!u.busyModeUntil && u.busyModeUntil >= todayJst;

    const generated = buildTaskForUser({
      userId: user.id,
      targetDate: todayJst,
      now,
      weekdayMinutes: u.weekdayMinutes,
      weekendMinutes: u.weekendMinutes,
      isWeekend,
      isBusyMode,
      streakCount: u.streakCount,
      masteryProfiles: masteryInput,
      recentAttempts: recentInput,
      questionPool: pool.map((q) => ({
        id: q.id,
        subTopic: q.subTopic,
        difficulty: q.difficulty,
        isNumeric: q.isNumeric,
        published: q.published,
      })),
    });

    const [inserted] = await db
      .insert(dailyTasks)
      .values({
        userId: user.id,
        targetDate: todayJst,
        questionIds: generated.questionIds,
        composition: generated.composition,
        reasonMd: generated.reasonMd,
        estimatedMinutes: generated.estimatedMinutes,
      })
      .returning();

    return NextResponse.json(serialize(inserted!));
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}

function serialize(row: typeof dailyTasks.$inferSelect) {
  return {
    id: row.id,
    targetDate: row.targetDate,
    questionIds: row.questionIds,
    composition: row.composition as { new: number; review: number; weak: number },
    reasonMd: row.reasonMd,
    estimatedMinutes: row.estimatedMinutes,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

function formatJstDate(d: Date): string {
  // JST = UTC+9
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function isWeekendJst(d: Date): boolean {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  return day === 0 || day === 6;
}
