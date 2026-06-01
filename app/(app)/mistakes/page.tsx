// 間違えリスト画面
// - 上部サマリ: 現在の間違え数 / 今週正解した数 / 復習優先(2回以上間違え)
// - 教科別の間違え%
// - 「間違えリストだけ解く」ボタン → /practice/mistakes/random
// - リスト100件(教科・頻度・追加日)
// - 各行タップ → /practice/[id]?source=mistakes(ホーム進捗にカウントされない)
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ChevronLeft, X, Shuffle, TrendingDown, TrendingUp } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  id: string;
  section: string;
  sub_topic: string;
  body_md: string;
  attempted_at: string;
  wrong_count: number;
};

type Summary = {
  current_wrong: number; // 復習が必要な問題(直近で間違えた・まだ正解していない)
  this_week_resolved: number; // 今週、間違えた問題を後で正解した数
  high_priority: number; // 2回以上間違えた問題
};

type SectionStats = {
  section: string;
  total: number;
  wrong: number;
  wrong_pct: number;
};

async function getWrongList(userId: string): Promise<Row[]> {
  try {
    // 「過去に間違えた問題のうち、直近2回が連続正解で解除されていない」問題
    const result = await db.execute(sql`
      with attempt_seq as (
        select question_id, is_correct, attempted_at,
               row_number() over (partition by question_id order by attempted_at desc) as rn
        from attempts where user_id = ${userId}
      ),
      last_two as (
        select question_id,
               max(case when rn=1 then is_correct end) as last1,
               max(case when rn=2 then is_correct end) as last2,
               max(case when rn=1 then attempted_at end) as last_attempt
        from attempt_seq where rn <= 2
        group by question_id
      ),
      ever_wrong as (
        select question_id, max(attempted_at) as last_wrong_at,
               count(*) filter (where is_correct = false) as wrong_count
        from attempts
        where user_id = ${userId} and is_correct = false
        group by question_id
      )
      select q.id::text as id, q.section, q.sub_topic, q.body_md,
             to_char(coalesce(lt.last_attempt, ew.last_wrong_at), 'YYYY-MM-DD"T"HH24:MI:SS') as attempted_at,
             ew.wrong_count::int as wrong_count
      from ever_wrong ew
      left join last_two lt on lt.question_id = ew.question_id
      join questions q on q.id = ew.question_id
      where q.published = true
        and (lt.last1 is not true or lt.last2 is not true)
      order by coalesce(lt.last_attempt, ew.last_wrong_at) desc
      limit 100
    `);
    const rows = (result as unknown as { rows?: Row[] }).rows
      ?? (result as unknown as Row[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

async function getSummary(userId: string): Promise<Summary> {
  try {
    // current_wrong: 間違えたことがある問題のうち、直近2回連続正解で解除されていないもの
    const r1 = await db.execute(sql`
      with attempt_seq as (
        select question_id, is_correct,
               row_number() over (partition by question_id order by attempted_at desc) as rn
        from attempts where user_id = ${userId}
      ),
      last_two as (
        select question_id,
               max(case when rn=1 then is_correct end) as last1,
               max(case when rn=2 then is_correct end) as last2
        from attempt_seq where rn <= 2
        group by question_id
      ),
      ever_wrong as (
        select distinct question_id from attempts
        where user_id = ${userId} and is_correct = false
      )
      select count(*)::int as c
      from ever_wrong ew
      left join last_two lt on lt.question_id = ew.question_id
      where (lt.last1 is not true or lt.last2 is not true)
    `);
    const r1rows = (r1 as unknown as { rows?: { c: number }[] }).rows
      ?? (r1 as unknown as { c: number }[]);
    const current_wrong = r1rows?.[0]?.c ?? 0;

    // this_week_resolved: 直近7日で、過去に間違えた問題を正解した数
    const r2 = await db.execute(sql`
      select count(distinct a.question_id)::int as c
      from attempts a
      where a.user_id = ${userId}
        and a.is_correct = true
        and a.attempted_at >= (now() - interval '7 days')
        and exists (
          select 1 from attempts a0
          where a0.user_id = ${userId}
            and a0.question_id = a.question_id
            and a0.is_correct = false
            and a0.attempted_at < a.attempted_at
        )
    `);
    const r2rows = (r2 as unknown as { rows?: { c: number }[] }).rows
      ?? (r2 as unknown as { c: number }[]);
    const this_week_resolved = r2rows?.[0]?.c ?? 0;

    // high_priority: 2回以上間違えた問題
    const r3 = await db.execute(sql`
      select count(*)::int as c from (
        select question_id from attempts
        where user_id = ${userId} and is_correct = false
        group by question_id
        having count(*) >= 2
      ) t
    `);
    const r3rows = (r3 as unknown as { rows?: { c: number }[] }).rows
      ?? (r3 as unknown as { c: number }[]);
    const high_priority = r3rows?.[0]?.c ?? 0;

    return { current_wrong, this_week_resolved, high_priority };
  } catch {
    return { current_wrong: 0, this_week_resolved: 0, high_priority: 0 };
  }
}

async function getSectionStats(userId: string): Promise<SectionStats[]> {
  try {
    const result = await db.execute(sql`
      select q.section,
             count(*)::int as total,
             count(*) filter (where a.is_correct = false)::int as wrong
      from attempts a join questions q on q.id = a.question_id
      where a.user_id = ${userId}
      group by q.section
      order by wrong desc
    `);
    const rows = (result as unknown as { rows?: { section: string; total: number; wrong: number }[] }).rows
      ?? (result as unknown as { section: string; total: number; wrong: number }[]);
    return (rows ?? []).map((r) => ({
      ...r,
      wrong_pct: r.total > 0 ? Math.round((r.wrong / r.total) * 100) : 0,
    }));
  } catch {
    return [];
  }
}

export default async function MistakesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  const [items, summary, sections] = await Promise.all([
    getWrongList(user.id),
    getSummary(user.id),
    getSectionStats(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5 text-jigen-ink">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/home"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-jigen-ink-soft hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
          aria-label="ホームへ戻る"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">間違えリスト</h1>
      </div>

      {/* サマリ */}
      <section className="mb-4 rounded-xl border border-jigen-gold/30 bg-panel-gradient p-4 shadow-panel">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-jigen-gold">
          あなたの間違え状況
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">現在の間違え</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-jigen-gold">{summary.current_wrong}</p>
            <p className="text-[10px] text-jigen-ink-mute">復習が必要</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">今週解除</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{summary.this_week_resolved}</p>
            <p className="text-[10px] text-jigen-ink-mute">復習して正解</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">復習優先</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-jigen-warning">{summary.high_priority}</p>
            <p className="text-[10px] text-jigen-ink-mute">2回以上間違え</p>
          </div>
        </div>
      </section>

      {/* 教科別 */}
      {sections.length > 0 ? (
        <section className="mb-4 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel">
          <h2 className="mb-3 text-sm font-bold">教科ごとの間違え率</h2>
          <ul className="flex flex-col gap-2.5">
            {sections.map((s) => (
              <li key={s.section}>
                <div className="flex items-baseline justify-between text-xs text-jigen-ink-soft">
                  <span className="font-semibold text-jigen-ink">{s.section}</span>
                  <span>
                    <span className="tabular-nums text-jigen-warning">{s.wrong_pct}%</span>
                    <span className="ml-2 tabular-nums text-jigen-ink-mute">
                      ({s.wrong}/{s.total} 問)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-jigen-bg-panel-2">
                  <div
                    className="h-full rounded-full bg-jigen-warning"
                    style={{ width: `${s.wrong_pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* まとめて解くボタン */}
      {items.length > 0 ? (
        <Link
          href="/practice/mistakes/random"
          className="mb-4 flex items-center justify-between rounded-xl border border-jigen-gold/30 bg-gold-gradient/20 p-4 shadow-gold-glow transition-transform hover:scale-[1.01]"
        >
          <div>
            <p className="text-sm font-bold text-jigen-ink">間違えリストだけ解く</p>
            <p className="text-xs text-jigen-ink-soft">
              リストの問題からまとめて解きます(進捗には加算しません)
            </p>
          </div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient text-jigen-bg-dark shadow-gold-glow">
            <Shuffle aria-hidden className="h-5 w-5" />
          </span>
        </Link>
      ) : null}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">復習対象</h2>
        <span className="rounded-md border border-jigen-border-soft px-2 py-0.5 text-xs text-jigen-ink-mute">
          {items.length} 件
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-8 text-center">
          <TiranoSensei size="md" glow />
          <p className="text-sm text-jigen-ink-soft">
            まだ間違えた問題はありません。
            <br />
            「今日の問題」から取り組んでみましょう。
          </p>
          <Link
            href="/practice/random"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gold-gradient px-6 text-sm font-bold text-jigen-bg-dark shadow-gold-glow hover:scale-[1.02] transition-transform"
          >
            問題を解く
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/practice/${it.id}?source=mistakes`}
                className="flex items-start gap-3 rounded-lg border border-jigen-border-soft bg-jigen-bg-panel p-3 transition-colors hover:border-jigen-gold/40 hover:bg-jigen-bg-panel-2"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-jigen-warning bg-jigen-warning-soft/30 text-jigen-warning"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-jigen-ink-mute">
                    <span>{it.section}</span>
                    <span aria-hidden>/</span>
                    <span className="truncate">{it.sub_topic}</span>
                    {it.wrong_count > 1 ? (
                      <span className="ml-auto rounded bg-jigen-warning-soft/30 px-1.5 py-0.5 text-[10px] text-jigen-warning">
                        ×{it.wrong_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-jigen-ink">
                    {it.body_md}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
