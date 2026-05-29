import { NextResponse } from 'next/server';
import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { verifyCronSecret } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  users,
  attempts,
  masteryProfiles,
  questions,
  dailyTasks,
  subscriptions,
} from '@/db/schema';
import {
  buildTaskForUser,
  type AttemptHistoryInput,
  type MasteryInput,
  type QuestionInput,
} from '@/lib/learning/task-generator';

// Cron: 毎日 JST 00:00 — 全アクティブユーザーの「今日のタスク」を生成
// 技術構築計画§4.1, §4.3 (N+1 回避: 4 クエリで全データを一括取得)
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return jsonError(500, 'config_error', 'CRON_SECRET missing');
  }
  if (!verifyCronSecret(req)) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return jsonError(500, 'config_error', 'DATABASE_URL missing');
  }

  const now = new Date();
  const targetDate = formatJstDate(now); // 「これから始まる JST 今日」
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  try {
    // 1) アクティブユーザー: 過去7日 Attempt があるか、trialing / active のサブスク保有者
    //    1 クエリで取り切る(LEFT JOIN + EXISTS でも良いが SQL シンプル優先)
    const activeUsers = await db
      .select({
        id: users.id,
        weekdayMinutes: users.weekdayMinutes,
        weekendMinutes: users.weekendMinutes,
        streakCount: users.streakCount,
        busyModeUntil: users.busyModeUntil,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(
        or(
          // 過去7日に Attempt あり
          sql`exists (
            select 1 from ${attempts}
            where ${attempts.userId} = ${users.id}
              and ${attempts.attemptedAt} >= ${sevenDaysAgo}
          )`,
          inArray(subscriptions.status, ['trialing', 'active']),
        ),
      );

    if (activeUsers.length === 0) {
      return NextResponse.json({ ok: true, generated: 0, users: 0 });
    }

    const userIds = activeUsers.map((u) => u.id);

    // 2) mastery_profiles を一括取得
    const allMastery = await db
      .select()
      .from(masteryProfiles)
      .where(inArray(masteryProfiles.userId, userIds));

    // 3) 直近 7 日 Attempt + 対応 Question(sub_topic / isNumeric)を JOIN で一括取得
    const allRecent = await db
      .select({
        userId: attempts.userId,
        questionId: attempts.questionId,
        isCorrect: attempts.isCorrect,
        isNearMiss: attempts.isNearMiss,
        attemptedAt: attempts.attemptedAt,
        subTopic: questions.subTopic,
        isNumeric: questions.isNumeric,
      })
      .from(attempts)
      .innerJoin(questions, eq(attempts.questionId, questions.id))
      .where(
        and(
          inArray(attempts.userId, userIds),
          gte(attempts.attemptedAt, sevenDaysAgo),
        ),
      );

    // 4) 公開問題プール(全ユーザー共通でメモリ常駐 OK: MVP 600 問規模)
    const pool = await db
      .select({
        id: questions.id,
        subTopic: questions.subTopic,
        difficulty: questions.difficulty,
        isNumeric: questions.isNumeric,
        published: questions.published,
      })
      .from(questions)
      .where(eq(questions.published, true));

    if (pool.length === 0) {
      return NextResponse.json({
        ok: true,
        generated: 0,
        users: activeUsers.length,
        skipped_reason: 'no published questions',
      });
    }

    const questionPool: QuestionInput[] = pool.map((q) => ({
      id: q.id,
      subTopic: q.subTopic,
      difficulty: q.difficulty,
      isNumeric: q.isNumeric,
      published: q.published,
    }));

    // 5) インデックスを構築してメモリ上で全件構築
    const masteryByUser = groupBy(allMastery, (m) => m.userId);
    const attemptsByUser = groupBy(allRecent, (a) => a.userId);

    const isWeekendFlag = isWeekendJst(now);

    const rows = activeUsers.map((u) => {
      const userMastery = masteryByUser.get(u.id) ?? [];
      const userAttempts = attemptsByUser.get(u.id) ?? [];

      const masteryInput: MasteryInput[] = userMastery.map((m) => ({
        subTopic: m.subTopic,
        masteryP: m.masteryP,
        nextReviewAt: m.nextReviewAt,
        lastPracticedAt: m.lastPracticedAt,
        attemptsCount: m.attemptsCount,
      }));

      const recentInput: AttemptHistoryInput[] = userAttempts.map((a) => ({
        questionId: a.questionId,
        subTopic: a.subTopic,
        isCorrect: a.isCorrect,
        isNearMiss: a.isNearMiss,
        isNumeric: a.isNumeric,
        attemptedAt: a.attemptedAt,
      }));

      const isBusyMode = !!u.busyModeUntil && u.busyModeUntil >= targetDate;

      const generated = buildTaskForUser({
        userId: u.id,
        targetDate,
        now,
        weekdayMinutes: u.weekdayMinutes,
        weekendMinutes: u.weekendMinutes,
        isWeekend: isWeekendFlag,
        isBusyMode,
        streakCount: u.streakCount,
        masteryProfiles: masteryInput,
        recentAttempts: recentInput,
        questionPool,
      });

      return generated;
    });

    // 6) bulk upsert(unique(user_id, target_date) で重複防止)
    //    バッチサイズで切る(Postgres パラメータ上限対策 65535)
    const BATCH = 500;
    let generated = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const inserted = await db
        .insert(dailyTasks)
        .values(
          slice.map((r) => ({
            userId: r.userId,
            targetDate: r.targetDate,
            questionIds: r.questionIds,
            composition: r.composition,
            reasonMd: r.reasonMd,
            estimatedMinutes: r.estimatedMinutes,
          })),
        )
        .onConflictDoNothing({
          target: [dailyTasks.userId, dailyTasks.targetDate],
        })
        .returning({ id: dailyTasks.id });
      generated += inserted.length;
    }

    return NextResponse.json({
      ok: true,
      users: activeUsers.length,
      generated,
      target_date: targetDate,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cron/generate-daily-tasks] error', err);
    return jsonError(500, 'internal_error', (err as Error).message);
  }
}

function groupBy<T, K>(arr: T[], key: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = key(x);
    const cur = m.get(k);
    if (cur) cur.push(x);
    else m.set(k, [x]);
  }
  return m;
}

function formatJstDate(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function isWeekendJst(d: Date): boolean {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  return day === 0 || day === 6;
}

function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json({ error: { code, message } }, { status });
}
