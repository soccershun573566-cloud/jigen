// 重いバナー(金曜小テスト + 特別模試) を Suspense で後からストリーミング表示
// Server Component なので async + 直接 DB アクセス可能
import Link from 'next/link';
import { ArrowRight, Check, Clock, Sparkles } from 'lucide-react';
import { getSpecialMock, getWeeklyTestStatus } from '@/lib/home-data';

export async function BottomBanners({ userId }: { userId: string }) {
  // 重い処理を並列実行(2本)
  const [specialMock, weeklyTest] = await Promise.all([
    getSpecialMock(userId),
    getWeeklyTestStatus(userId),
  ]);

  return (
    <>
      {/* 金曜小テストバナー(状態に応じて表示) */}
      {weeklyTest.status === 'completed' && weeklyTest.score !== undefined ? (
        <Link
          href="/weekly-test"
          className="mb-3 flex items-center justify-between rounded-xl border border-jigen-gold/30 bg-jigen-bg-panel/60 px-4 py-3 text-xs text-jigen-ink-soft hover:border-jigen-gold/60"
        >
          <span className="inline-flex items-center gap-2">
            <Check aria-hidden className="h-3.5 w-3.5 text-emerald-400" />
            今週の金曜小テスト 完了 — スコア: <span className="font-bold text-jigen-gold">{weeklyTest.score}/{weeklyTest.total}問</span>
          </span>
          <span className="inline-flex items-center gap-1 text-jigen-gold">
            結果を見る <ArrowRight aria-hidden className="h-3 w-3" />
          </span>
        </Link>
      ) : weeklyTest.status === 'available' || weeklyTest.status === 'in_progress' ? (
        <Link
          href="/weekly-test"
          className="group mb-3 block rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-5 shadow-gold-glow transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-jigen-bg-dark">
              <Sparkles aria-hidden className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-gold">
                Weekly Test
              </p>
              <p className="text-base font-bold text-jigen-ink sm:text-lg">
                {weeklyTest.status === 'in_progress'
                  ? '金曜小テストの続きから(25問)'
                  : '今週の金曜小テスト 開催中(25問)'}
              </p>
              <p className="mt-1 text-xs text-jigen-ink-soft">
                {weeklyTest.status === 'in_progress'
                  ? '進捗は保存されています。続きから再開できます。'
                  : '直近7日の解答から正解13問+間違え12問。 学習の定着を確認しましょう。'}
              </p>
            </div>
            <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-jigen-gold transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      ) : weeklyTest.status === 'upcoming' && weeklyTest.daysToFriday > 0 ? (
        <Link
          href="/weekly-test"
          className="mb-3 block rounded-2xl border border-jigen-gold/40 bg-jigen-bg-panel/80 p-4 transition-colors hover:border-jigen-gold"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
              <Clock aria-hidden className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-jigen-gold">次の金曜小テスト</p>
              <p className="text-sm font-bold text-jigen-ink">
                開催まで <span className="text-jigen-gold">{weeklyTest.daysToFriday}日</span>(毎週金曜0時開始)
              </p>
            </div>
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-jigen-gold" />
          </div>
        </Link>
      ) : null}

      {/* 特別模試バナー(DB連動・期間判定) */}
      {specialMock && specialMock.attempt_status !== 'completed' ? (
        specialMock.status === 'open' ? (
          <Link
            href={`/mock-exam/${specialMock.id}`}
            className="group mb-3 block overflow-hidden rounded-2xl border-2 border-jigen-warning bg-gradient-to-br from-red-900/40 via-jigen-bg-panel to-jigen-bg-panel p-5 shadow-[0_0_20px_rgba(239,68,68,0.25)] transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-jigen-warning/20 text-jigen-warning">
                <span className="text-xl">🔥</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-jigen-warning">
                  期間限定 開催中
                </p>
                <p className="text-base font-bold text-jigen-ink sm:text-lg">
                  {specialMock.title}
                </p>
                <p className="mt-1 text-xs text-jigen-ink-soft">
                  {specialMock.attempt_status === 'in_progress' ? '進捗は保存されています。続きから再開できます。' : '本番形式・50問・約60分'}
                </p>
              </div>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-jigen-warning transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ) : specialMock.status === 'upcoming' ? (
          <Link
            href="/mock-exam"
            className="mb-3 block rounded-2xl border border-jigen-warning/40 bg-jigen-bg-panel/80 p-4 transition-colors hover:border-jigen-warning"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jigen-warning/15 text-jigen-warning">
                <Clock aria-hidden className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-jigen-warning">開催予告</p>
                <p className="text-sm font-bold text-jigen-ink">
                  {specialMock.title} まで <span className="text-jigen-warning">{specialMock.days_to_open}日</span>
                </p>
              </div>
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-jigen-warning" />
            </div>
          </Link>
        ) : null
      ) : null}
    </>
  );
}

// Suspense fallback 用のスケルトン
export function BottomBannersSkeleton() {
  return (
    <div className="mb-3 space-y-3">
      <div className="h-20 animate-pulse rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel" />
    </div>
  );
}
