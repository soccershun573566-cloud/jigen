import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { verifyCronSecret } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  users,
  pushSubscriptions,
  dailyTasks,
  notificationLogs,
} from '@/db/schema';
import { sendPush } from '@/lib/notifications/push';
import { sendEmail } from '@/lib/notifications/email';

// Cron: JST 07:00 起動だが、ユーザーごとの notification_morning_at に合わせて
//       「現在の時刻 ±15分」に通知時刻が設定されているユーザーを抽出して送信
// 技術構築計画§7.1
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const WINDOW_MIN = 15;

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
  const todayJst = formatJstDate(now);

  try {
    // 通知有効ユーザーのうち、JST 換算で「現在の時刻 ±15分」に設定された人を抽出
    // notification_morning_at は time 型(タイムゾーン無し)で JST 想定
    const recipients = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        morningAt: users.notificationMorningAt,
      })
      .from(users)
      .where(
        and(
          eq(users.notificationEnabled, true),
          // JST 現在時刻の time と notification_morning_at の差が ±WINDOW_MIN 分以内
          sql`abs(extract(epoch from (
            (now() at time zone 'Asia/Tokyo')::time - ${users.notificationMorningAt}
          ))) <= ${WINDOW_MIN * 60}`,
        ),
      );

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, candidates: 0 });
    }

    const userIds = recipients.map((r) => r.id);

    // 今日のタスクを一括取得
    const todaysTasks = await db
      .select({
        userId: dailyTasks.userId,
        estimatedMinutes: dailyTasks.estimatedMinutes,
        composition: dailyTasks.composition,
      })
      .from(dailyTasks)
      .where(
        and(
          inArray(dailyTasks.userId, userIds),
          eq(dailyTasks.targetDate, todayJst),
        ),
      );
    const taskByUser = new Map(todaysTasks.map((t) => [t.userId, t]));

    // Push 購読を一括取得
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));
    const subsByUser = groupBy(subs, (s) => s.userId);

    let pushSent = 0;
    let emailSent = 0;
    let pushFailed = 0;
    const logRows: Array<{ userId: string; channel: string; kind: string }> = [];

    // 1ユーザーずつ送る(エラーは個別に握り潰す)
    await Promise.all(
      recipients.map(async (r) => {
        const task = taskByUser.get(r.id);
        const payload = buildPayload(r.displayName ?? null, task);

        const userSubs = subsByUser.get(r.id) ?? [];
        let deliveredPush = false;

        if (userSubs.length > 0) {
          await Promise.all(
            userSubs.map(async (s) => {
              try {
                await sendPush(
                  {
                    endpoint: s.endpoint,
                    keys: { p256dh: s.p256dh, auth: s.auth },
                  },
                  payload,
                );
                deliveredPush = true;
              } catch (err) {
                pushFailed++;
                // 410 Gone(購読失効)は別 Cron で掃除する想定
                // eslint-disable-next-line no-console
                console.warn('[cron/send-morning-push] push failed', r.id, (err as Error).message);
              }
            }),
          );
        }

        if (deliveredPush) {
          pushSent++;
          logRows.push({ userId: r.id, channel: 'push', kind: 'morning' });
          return;
        }

        // フォールバック: メール
        try {
          await sendEmail({
            to: r.email,
            subject: payload.title,
            text: payload.body,
            html: `<p>${escapeHtml(payload.body)}</p>`,
          });
          emailSent++;
          logRows.push({ userId: r.id, channel: 'email', kind: 'morning' });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[cron/send-morning-push] email failed', r.id, (err as Error).message);
        }
      }),
    );

    // notification_logs に bulk insert
    if (logRows.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < logRows.length; i += BATCH) {
        await db.insert(notificationLogs).values(logRows.slice(i, i + BATCH));
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: recipients.length,
      push_sent: pushSent,
      email_sent: emailSent,
      push_failed: pushFailed,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cron/send-morning-push] error', err);
    return jsonError(500, 'internal_error', (err as Error).message);
  }
}

function buildPayload(
  displayName: string | null,
  task: { estimatedMinutes: number; composition: unknown } | undefined,
): { title: string; body: string; url: string } {
  const name = displayName ?? 'お知らせ';
  if (!task) {
    return {
      title: 'ジゲン',
      body: '今日のタスクをまだ生成中です。ホームを開いてみてください。',
      url: '/home',
    };
  }
  const comp = task.composition as { new?: number; review?: number; weak?: number } | null;
  const total = (comp?.new ?? 0) + (comp?.review ?? 0) + (comp?.weak ?? 0);
  return {
    title: 'ジゲン: 今日のセットが届きました',
    body: `${total}問・約${task.estimatedMinutes}分。${name}向けに最適化済みです。`,
    url: '/home',
  };
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatJstDate(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json({ error: { code, message } }, { status });
}
