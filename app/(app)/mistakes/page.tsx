// 間違えリスト画面 — 直近で間違えた問題の一覧
// 各行をタップで該当問題を再演習(問題詳細ページへ)
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ChevronLeft, X } from 'lucide-react';
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

async function getWrongList(userId: string): Promise<Row[]> {
  try {
    const result = await db.execute(sql`
      with latest_wrong as (
        select distinct on (question_id) question_id, attempted_at
        from attempts
        where user_id = ${userId} and is_correct = false
        order by question_id, attempted_at desc
      )
      select q.id::text as id, q.section, q.sub_topic, q.body_md, lw.attempted_at,
             (select count(*) from attempts a2 where a2.user_id = ${userId} and a2.question_id = q.id and a2.is_correct = false)::int as wrong_count
      from latest_wrong lw
      join questions q on q.id = lw.question_id
      where q.published = true
      order by lw.attempted_at desc
      limit 100
    `);
    const rows =
      (result as unknown as { rows?: Row[] }).rows ??
      (result as unknown as Row[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

export default async function MistakesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  const items = await getWrongList(user.id);

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
        <span className="ml-auto rounded-md border border-jigen-border-soft px-2 py-0.5 text-xs text-jigen-ink-mute">
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
                href={`/practice/${it.id}`}
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
