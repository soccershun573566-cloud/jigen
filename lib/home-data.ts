// ホーム画面のデータ取得関数(Server用)
// home/page.tsx と Suspense子コンポーネントの両方から利用される
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

// 期間限定の特別模試(初回模試以外)を1件取得
export type SpecialMockRow = {
  id: string;
  title: string;
  description: string | null;
  questions_count: number;
  available_from: string | null;
  available_until: string | null;
  status: 'open' | 'upcoming' | 'closed';
  days_to_open: number;
  attempt_status: 'unstarted' | 'in_progress' | 'completed';
};
export async function getSpecialMock(userId: string): Promise<SpecialMockRow | null> {
  try {
    const r = await db.execute(sql`
      with exams as (
        select id, title, description, questions_count, available_from, available_until,
               case
                 when (available_from is null or now() >= available_from)
                  and (available_until is null or now() <= available_until) then 'open'
                 when available_from is not null and now() < available_from then 'upcoming'
                 else 'closed'
               end as status,
               case when available_from is not null
                    then ceil(extract(epoch from (available_from - now())) / 86400)::int
                    else 0 end as days_to_open
        from mock_exams
        where is_active = true and id != 'initial-50'
      )
      select e.*,
             case when ma.completed_at is not null then 'completed'
                  when ma.id is not null then 'in_progress'
                  else 'unstarted' end as attempt_status
      from exams e
      left join mock_attempts ma on ma.mock_exam_id = e.id and ma.user_id = ${userId}::uuid
      where e.status in ('open', 'upcoming')
      order by case e.status when 'open' then 0 else 1 end, e.available_from nulls last
      limit 1
    `);
    const rows = (r as unknown as { rows?: SpecialMockRow[] }).rows ?? (r as unknown as SpecialMockRow[]);
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

// 今週の金曜小テスト状態(ホームバナー用)
export type WeeklyTestStatus = {
  status: 'upcoming' | 'available' | 'in_progress' | 'completed' | 'no_data';
  daysToFriday: number;
  score?: number;
  total?: number;
};
export async function getWeeklyTestStatus(userId: string): Promise<WeeklyTestStatus> {
  try {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const day = jst.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(jst);
    monday.setUTCDate(jst.getUTCDate() + diff);
    const mondayStr = monday.toISOString().slice(0, 10);
    const daysToFriday = day >= 1 && day <= 4 ? (5 - day) : 0;
    const isOpen = day === 5 || day === 6 || day === 0;

    const [recentR, weeklyR] = await Promise.all([
      db.execute(sql`
        select count(*)::int as c from attempts
        where user_id = ${userId}::uuid
          and attempted_at >= now() - interval '7 days'
      `).catch(() => null),
      db.execute(sql`
        select score, jsonb_array_length(question_ids) as total, completed_at
        from weekly_test_attempts
        where user_id = ${userId}::uuid and week_start = ${mondayStr}::date
        limit 1
      `).catch(() => null),
    ]);

    const recentRows = recentR
      ? ((recentR as unknown as { rows?: { c: number }[] }).rows ?? (recentR as unknown as { c: number }[]))
      : [];
    const recentCount = recentRows?.[0]?.c ?? 0;

    const weeklyRows = weeklyR
      ? ((weeklyR as unknown as { rows?: Array<{ score: number | null; total: number; completed_at: string | null }> }).rows
          ?? (weeklyR as unknown as Array<{ score: number | null; total: number; completed_at: string | null }>))
      : [];
    const weekly = weeklyRows?.[0];

    if (weekly?.completed_at) {
      return { status: 'completed', daysToFriday, score: weekly.score ?? 0, total: weekly.total };
    }
    if (weekly && !weekly.completed_at) {
      return { status: 'in_progress', daysToFriday };
    }
    if (!isOpen) return { status: 'upcoming', daysToFriday };
    if (recentCount === 0) return { status: 'no_data', daysToFriday };
    return { status: 'available', daysToFriday };
  } catch {
    return { status: 'upcoming', daysToFriday: 0 };
  }
}
