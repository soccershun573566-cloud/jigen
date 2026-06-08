// /mock-exam — 模試一覧
// アクセス可能な模試 + 開催予定の模試をDBから取得して表示
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import {
  ArrowRight, Brain, Calendar, Check, ChevronRight, Clock,
  Flame, Loader2, Lock, Sparkles, Trophy,
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ExamRow = {
  id: string;
  title: string;
  description: string | null;
  questions_count: number;
  available_from: string | null;
  available_until: string | null;
  status: 'open' | 'upcoming' | 'closed';
  // ユーザー側の受験状況
  attempt_status: 'unstarted' | 'in_progress' | 'completed';
  score: number | null;
  current_question_index: number;
};

async function getExamsForUser(userId: string): Promise<ExamRow[]> {
  try {
    const r = await db.execute(sql`
      with exams as (
        select id, title, description, questions_count, available_from, available_until,
               case
                 when (available_from is null or now() >= available_from)
                  and (available_until is null or now() <= available_until) then 'open'
                 when available_from is not null and now() < available_from then 'upcoming'
                 else 'closed'
               end as status
        from mock_exams
        where is_active = true
      )
      select e.*,
             case when ma.completed_at is not null then 'completed'
                  when ma.id is not null then 'in_progress'
                  else 'unstarted' end as attempt_status,
             ma.score, coalesce(ma.current_question_index, 0) as current_question_index
      from exams e
      left join mock_attempts ma on ma.mock_exam_id = e.id and ma.user_id = ${userId}::uuid
      order by
        case e.status when 'open' then 0 when 'upcoming' then 1 else 2 end,
        e.available_from nulls last,
        e.id
    `);
    const rows = (r as unknown as { rows?: ExamRow[] }).rows ?? (r as unknown as ExamRow[]);
    return rows ?? [];
  } catch {
    return [];
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): number {
  if (!iso) return 0;
  try {
    const t = new Date(iso).getTime();
    const now = Date.now();
    return Math.ceil((t - now) / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

export default async function MockExamListPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  const exams = await getExamsForUser(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-wide text-jigen-ink">
          模試
        </h1>
        <p className="mt-1 text-sm text-jigen-ink-soft">
          現在地を測り、 翌日からの学習に反映させます。
        </p>
      </div>

      {/* 注意書き */}
      <section className="mb-6 rounded-xl border border-jigen-gold/30 bg-panel-gradient p-4">
        <div className="flex items-start gap-3">
          <Brain aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-jigen-gold" />
          <div className="flex-1 text-xs text-jigen-ink-soft">
            <p className="mb-1 font-bold text-jigen-ink">模試の結果は、 翌日からのAI出題に自動反映されます</p>
            <p>あなたの解答パターンから弱点プロファイルを自動生成し、 1日の問題が最適化されます。</p>
          </div>
        </div>
      </section>

      {/* 模試一覧 */}
      {exams.length === 0 ? (
        <section className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-8 text-center">
          <p className="text-sm text-jigen-ink-soft">現在、 利用可能な模試はありません。</p>
        </section>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const isOpen = exam.status === 'open';
            const isUpcoming = exam.status === 'upcoming';
            const isClosed = exam.status === 'closed';
            const isCompleted = exam.attempt_status === 'completed';
            const isInProgress = exam.attempt_status === 'in_progress';

            return (
              <article
                key={exam.id}
                className={[
                  'rounded-2xl border p-5 shadow-panel',
                  isOpen && !isCompleted ? 'border-jigen-gold bg-panel-gradient shadow-gold-glow' : 'border-jigen-border-soft bg-jigen-bg-panel',
                ].join(' ')}
              >
                {/* バッジ */}
                <div className="mb-3 flex items-center gap-2">
                  {isOpen && !isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-jigen-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-gold">
                      <Sparkles aria-hidden className="h-3 w-3" />
                      開催中
                    </span>
                  ) : null}
                  {isUpcoming ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-jigen-warning/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-warning">
                      <Lock aria-hidden className="h-3 w-3" />
                      開催予定
                    </span>
                  ) : null}
                  {isClosed && !isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-jigen-bg-panel-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-ink-mute">
                      終了
                    </span>
                  ) : null}
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                      <Check aria-hidden className="h-3 w-3" />
                      受験済み
                    </span>
                  ) : null}
                  {isInProgress ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-jigen-warning/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-warning">
                      <Clock aria-hidden className="h-3 w-3" />
                      中断中
                    </span>
                  ) : null}
                </div>

                {/* タイトル */}
                <h2 className="text-base font-bold text-jigen-ink sm:text-lg">
                  {exam.title}
                </h2>

                {/* 期間 */}
                {(exam.available_from || exam.available_until) ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-jigen-ink-soft">
                    <Calendar aria-hidden className="h-3 w-3" />
                    {exam.available_from ? formatDate(exam.available_from) : ''}
                    {exam.available_from && exam.available_until ? ' 〜 ' : ''}
                    {exam.available_until ? formatDate(exam.available_until) : ''}
                  </p>
                ) : null}

                {/* 説明 */}
                {exam.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-jigen-ink-soft">
                    {exam.description}
                  </p>
                ) : null}

                {/* 問題数・スコア */}
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <span className="text-jigen-ink-mute">問題数: <span className="font-bold text-jigen-ink">{exam.questions_count}問</span></span>
                  {isCompleted && exam.score !== null ? (
                    <span className="text-jigen-ink-mute">
                      スコア: <span className="font-bold text-jigen-gold">{exam.score}/{exam.questions_count}問</span>
                    </span>
                  ) : null}
                  {isInProgress ? (
                    <span className="text-jigen-warning">
                      {exam.current_question_index}/{exam.questions_count}問 解答済
                    </span>
                  ) : null}
                </div>

                {/* CTA */}
                <div className="mt-4">
                  {isUpcoming && exam.available_from ? (
                    <div className="rounded-lg border border-jigen-warning/30 bg-jigen-warning-soft/10 p-3 text-center">
                      <p className="text-xs text-jigen-warning">
                        開催まで <span className="text-xl font-extrabold tabular-nums">{daysUntil(exam.available_from)}</span> 日
                      </p>
                      <p className="mt-1 text-[10px] text-jigen-ink-mute">
                        {formatDate(exam.available_from)} 0:00 から受験可能
                      </p>
                    </div>
                  ) : isOpen ? (
                    <Link
                      href={`/mock-exam/${exam.id}`}
                      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 text-sm font-bold text-jigen-bg-dark shadow-gold-glow transition-transform hover:scale-[1.01]"
                    >
                      {isCompleted ? '結果を見る' : isInProgress ? '続きから再開' : '受験を始める'}
                      <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : isClosed && isCompleted ? (
                    <Link
                      href={`/mock-exam/${exam.id}`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-6 text-sm font-semibold text-jigen-gold hover:bg-jigen-bg-panel-2"
                    >
                      結果を確認
                      <ChevronRight aria-hidden className="h-4 w-4" />
                    </Link>
                  ) : (
                    <p className="text-center text-xs text-jigen-ink-mute">この模試の受付は終了しました</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ティラノ先生コメント */}
      <section className="mt-8 rounded-xl border border-jigen-gold/30 bg-panel-gradient p-5">
        <div className="flex items-start gap-3">
          <TiranoSensei size="sm" glow />
          <div className="flex-1 text-sm text-jigen-ink-soft">
            <p className="font-bold text-jigen-gold">ティラノ先生から</p>
            <p className="mt-1">
              模試は「現在地を測るチャンス」 です。 結果が良くても悪くても、 翌日からのAI出題が必ずあなたに合わせてくれます。 気楽に挑戦してください。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
