import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  users,
  masteryProfiles,
  dailyTasks,
  questions,
} from '@/db/schema';
import { DiagnosisSubmitRequest } from '@/types/api';
import { defaultBktParams, updateMastery } from '@/lib/learning/bkt';

// POST /api/diagnosis/submit — 現状診断送信
// 入力: 回答配列 + 学習可能時間
// 1) 各 sub_topic ごとに初期 mastery_p を BKT で算出
// 2) mastery_profiles へ初期投入
// 3) users 更新(weekday/weekend minutes、target_exam_date)
// 4) 当日 DailyTask を成功体験優先(3問)で生成
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = DiagnosisSubmitRequest.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: parsed.error.message } },
        { status: 400 },
      );
    }
    const { answers, weekdayMinutes, weekendMinutes, targetExamDate } =
      parsed.data;

    // 1) sub_topic 別 mastery_p を算出
    const bySubTopic = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const e = bySubTopic.get(a.subTopic) ?? { correct: 0, total: 0 };
      e.total += 1;
      if (a.isCorrect) e.correct += 1;
      bySubTopic.set(a.subTopic, e);
    }

    const now = new Date();
    const masteryRows = Array.from(bySubTopic.entries()).map(([subTopic, c]) => {
      // pL0 から開始し各 attempt 分 BKT 更新で初期値を作る
      let p = defaultBktParams.pL0;
      for (let i = 0; i < c.correct; i++) p = updateMastery(p, true);
      for (let i = 0; i < c.total - c.correct; i++) p = updateMastery(p, false);
      return {
        userId: user.id,
        subTopic,
        masteryP: p,
        lastPracticedAt: now,
        nextReviewAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        attemptsCount: c.total,
        correctCount: c.correct,
        updatedAt: now,
      };
    });

    // 2) mastery_profiles UPSERT
    if (masteryRows.length > 0) {
      for (const row of masteryRows) {
        await db
          .insert(masteryProfiles)
          .values(row)
          .onConflictDoUpdate({
            target: [masteryProfiles.userId, masteryProfiles.subTopic],
            set: {
              masteryP: row.masteryP,
              lastPracticedAt: row.lastPracticedAt,
              nextReviewAt: row.nextReviewAt,
              attemptsCount: row.attemptsCount,
              correctCount: row.correctCount,
              updatedAt: row.updatedAt,
            },
          });
      }
    }

    // 3) users 更新
    await db
      .update(users)
      .set({
        weekdayMinutes,
        weekendMinutes,
        targetExamDate: targetExamDate ?? null,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    // 4) 弱点 TOP3
    const sorted = [...masteryRows].sort((a, b) => a.masteryP - b.masteryP);
    const weakTopTopics = sorted.slice(0, 3).map((m) => m.subTopic);

    // 5) 受験までの推定学習日数(暫定式: (1 - 平均mastery) * 120 + 14)
    const avg =
      masteryRows.length > 0
        ? masteryRows.reduce((s, m) => s + m.masteryP, 0) / masteryRows.length
        : defaultBktParams.pL0;
    const estimatedDaysToReady = Math.round((1 - avg) * 120 + 14);

    // 6) 初日タスク: 成功体験優先で 3 問(難易度低めの新規問題)
    const todayJst = formatJstDate(now);
    const pool = await db
      .select()
      .from(questions)
      .where(eq(questions.published, true));

    const easy = [...pool]
      .sort((a, b) => a.difficulty - b.difficulty)
      .slice(0, 3);

    const [task] = await db
      .insert(dailyTasks)
      .values({
        userId: user.id,
        targetDate: todayJst,
        questionIds: easy.map((q) => q.id),
        composition: { new: easy.length, review: 0, weak: 0 },
        reasonMd:
          '**診断完了**: まずは 3 問で「終わらせる感覚」を掴みましょう。明日から個別最適化したセットになります。',
        estimatedMinutes: Math.max(5, easy.length * 2),
      })
      .onConflictDoUpdate({
        target: [dailyTasks.userId, dailyTasks.targetDate],
        set: {
          questionIds: easy.map((q) => q.id),
          composition: { new: easy.length, review: 0, weak: 0 },
        },
      })
      .returning();

    return NextResponse.json({
      weakTopTopics,
      estimatedDaysToReady,
      todayTaskId: task!.id,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}

function formatJstDate(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
