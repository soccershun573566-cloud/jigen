import { NextResponse } from 'next/server';
import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { verifyCronSecret } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  users,
  attempts,
  questions,
  subscriptions,
  notificationLogs,
} from '@/db/schema';
import { sendEmail } from '@/lib/notifications/email';

// Cron: 日曜 JST 21:00 — 週次レポート生成 & 通知
// 技術構築計画§9 ユウ§S10
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  try {
    // 1) アクティブユーザー(過去7日 Attempt 有 OR trialing/active)
    const activeUsers = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        notificationEnabled: users.notificationEnabled,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(
        or(
          sql`exists (
            select 1 from ${attempts}
            where ${attempts.userId} = ${users.id}
              and ${attempts.attemptedAt} >= ${sevenDaysAgo}
          )`,
          inArray(subscriptions.status, ['trialing', 'active']),
        ),
      );

    if (activeUsers.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const userIds = activeUsers.map((u) => u.id);

    // 2) 直近7日 Attempt + Question を JOIN で一括取得
    const rows = await db
      .select({
        userId: attempts.userId,
        isCorrect: attempts.isCorrect,
        isNearMiss: attempts.isNearMiss,
        subTopic: questions.subTopic,
        attemptedAt: attempts.attemptedAt,
      })
      .from(attempts)
      .innerJoin(questions, eq(attempts.questionId, questions.id))
      .where(
        and(
          inArray(attempts.userId, userIds),
          gte(attempts.attemptedAt, sevenDaysAgo),
        ),
      );

    const byUser = groupBy(rows, (r) => r.userId);

    let emailsSent = 0;
    let inAppSaved = 0;
    const logBatch: Array<{ userId: string; channel: string; kind: string }> = [];

    await Promise.all(
      activeUsers.map(async (u) => {
        const userRows = byUser.get(u.id) ?? [];
        const summary = summarize(userRows);

        // 3) アプリ内通知保存(channel=in_app)。受信者画面で吸い上げる前提
        logBatch.push({ userId: u.id, channel: 'in_app', kind: 'weekly' });
        inAppSaved++;

        if (!u.notificationEnabled) return;

        // 4) メール送信
        try {
          await sendEmail({
            to: u.email,
            subject: `ジゲン 週次レポート(${summary.totalAttempts}問 / 正答率${summary.accuracyPct}%)`,
            text: renderText(u.displayName ?? null, summary),
            html: renderHtml(u.displayName ?? null, summary),
          });
          emailsSent++;
          logBatch.push({ userId: u.id, channel: 'email', kind: 'weekly' });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[cron/weekly-report] email failed', u.id, (err as Error).message);
        }
      }),
    );

    // 5) ログ書き出し
    if (logBatch.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < logBatch.length; i += BATCH) {
        await db.insert(notificationLogs).values(logBatch.slice(i, i + BATCH));
      }
    }

    return NextResponse.json({
      ok: true,
      processed: activeUsers.length,
      emails_sent: emailsSent,
      in_app_saved: inAppSaved,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cron/weekly-report] error', err);
    return jsonError(500, 'internal_error', (err as Error).message);
  }
}

type WeeklySummary = {
  totalAttempts: number;
  correct: number;
  nearMiss: number;
  accuracyPct: number;
  studyDays: number;
  topWeakSubTopics: Array<{ subTopic: string; misses: number }>;
};

function summarize(
  rows: Array<{
    isCorrect: boolean;
    isNearMiss: boolean;
    subTopic: string;
    attemptedAt: Date;
  }>,
): WeeklySummary {
  const total = rows.length;
  const correct = rows.filter((r) => r.isCorrect).length;
  const nearMiss = rows.filter((r) => r.isNearMiss).length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  // 学習日数(JST 日付ユニーク)
  const days = new Set<string>();
  for (const r of rows) {
    const jst = new Date(r.attemptedAt.getTime() + 9 * 60 * 60 * 1000);
    days.add(jst.toISOString().slice(0, 10));
  }

  // 単元別 miss 集計
  const missByTopic = new Map<string, number>();
  for (const r of rows) {
    if (r.isCorrect) continue;
    missByTopic.set(r.subTopic, (missByTopic.get(r.subTopic) ?? 0) + 1);
  }
  const topWeak = [...missByTopic.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subTopic, misses]) => ({ subTopic, misses }));

  return {
    totalAttempts: total,
    correct,
    nearMiss,
    accuracyPct: accuracy,
    studyDays: days.size,
    topWeakSubTopics: topWeak,
  };
}

function renderText(displayName: string | null, s: WeeklySummary): string {
  const name = displayName ?? '';
  const weak =
    s.topWeakSubTopics.length === 0
      ? '弱点単元の検出なし'
      : s.topWeakSubTopics.map((w) => `${w.subTopic}(${w.misses}問誤答)`).join(' / ');
  return [
    `${name}さんの先週のサマリです。`,
    '',
    `演習数: ${s.totalAttempts}問 / 正答: ${s.correct} / 惜しい: ${s.nearMiss}`,
    `正答率: ${s.accuracyPct}% / 学習日: ${s.studyDays}日`,
    `重点単元: ${weak}`,
    '',
    '今週のセットはホームから確認できます。',
  ].join('\n');
}

function renderHtml(displayName: string | null, s: WeeklySummary): string {
  const name = displayName ?? '';
  const weakHtml =
    s.topWeakSubTopics.length === 0
      ? '<li>弱点単元の検出なし</li>'
      : s.topWeakSubTopics
          .map((w) => `<li>${escapeHtml(w.subTopic)}(${w.misses}問誤答)</li>`)
          .join('');
  return `
<div style="font-family: -apple-system, system-ui, sans-serif; color: #0f172a;">
  <p>${escapeHtml(name)}さんの先週のサマリです。</p>
  <ul>
    <li>演習数: ${s.totalAttempts}問</li>
    <li>正答: ${s.correct} / 惜しい: ${s.nearMiss}</li>
    <li>正答率: ${s.accuracyPct}%</li>
    <li>学習日: ${s.studyDays}日</li>
  </ul>
  <p>重点単元:</p>
  <ul>${weakHtml}</ul>
  <p>今週のセットはホームから確認できます。</p>
</div>`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json({ error: { code, message } }, { status });
}
