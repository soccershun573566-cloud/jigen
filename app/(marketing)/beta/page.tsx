// β版専用LP — 2026年7月1次受験者向け緊急ローンチ
// 残り41日のカウントダウン + ¥980/月 × 3ヶ月 + 完走¥1,490永久ロック + 30名限定
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Flame,
  MessageSquare,
  Moon,
  Pencil,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { CheckoutButton } from '@/components/billing/CheckoutButton';

export const metadata: Metadata = {
  title: 'ジゲンβ版 30名限定募集 | 1級建築施工管理技士のAI伴走パートナー',
  description:
    '2026年7月の1次試験まで直前駆け込み層を救う、AI伴走パートナー「ジゲン」のβ版。月額¥980で即日学習スタート(無料期間なし)、完走者は永久¥1,490ロック特典付き。30名限定。',
};

// 日付計算を毎リクエストで実行(毎日0:00 JSTでカウントダウン更新)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 試験日と限定数(本番では env or DB)
const EXAM_DATE = '2026-07-19';
const BETA_LIMIT = 30;

function daysLeft(target: string): number {
  const t = new Date(target + 'T09:30:00+09:00').getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((t - now) / (24 * 60 * 60 * 1000)));
}

export default function BetaPage() {
  const dleft = daysLeft(EXAM_DATE);

  return (
    <main className="min-h-screen bg-jigen-bg-dark text-jigen-ink">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(239,68,68,0.15),transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[400px] w-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(245,196,65,0.10),transparent_70%)] blur-3xl"
        />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-16 pt-12 sm:pt-20">
          <nav className="absolute left-6 right-6 top-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-jigen-gold">ジゲン</span>
              <span className="hidden text-[10px] uppercase tracking-[0.3em] text-jigen-ink-mute sm:inline">
                JIGEN
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/auth/login" className="text-xs text-jigen-ink-soft hover:text-jigen-gold sm:text-sm">
                ログイン
              </Link>
            </div>
          </nav>

          {/* 緊急バッジ */}
          <div className="mt-6 mb-4 inline-flex items-center gap-2 rounded-full border border-jigen-warning/60 bg-jigen-warning-soft/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-jigen-warning backdrop-blur">
            <Flame aria-hidden className="h-3.5 w-3.5" />
            限定 {BETA_LIMIT}名 / 残り {dleft}日
          </div>

          {/* ティラノ先生 */}
          <div className="mb-6">
            <TiranoSensei size="lg" glow />
          </div>

          {/* メインコピー */}
          <h1 className="mb-5 text-center text-[32px] font-extrabold leading-[1.15] tracking-tight text-jigen-ink sm:text-5xl md:text-6xl">
            <span className="block">残り{dleft}日。</span>
            <span className="block bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.35)]">
              ジゲンと駆け抜けよう。
            </span>
          </h1>

          <p className="mb-8 max-w-2xl text-center text-base leading-relaxed text-jigen-ink-soft [text-wrap:balance] sm:text-lg">
            2026年7月19日の1級建築施工管理技士1次試験まで{dleft}日。
            AI伴走パートナー「ジゲン」 が、 あなたの最後の追い込みを伴走します。
          </p>

          {/* 価格バッジ */}
          <div className="mb-6 inline-flex items-baseline gap-3 rounded-2xl border-2 border-jigen-gold bg-panel-gradient px-6 py-4 shadow-gold-glow">
            <span className="text-[10px] uppercase tracking-widest text-jigen-gold">β1次プラン</span>
            <span className="text-4xl font-extrabold tabular-nums text-jigen-gold drop-shadow-[0_0_12px_rgba(245,196,65,0.4)]">
              ¥980
            </span>
            <span className="text-xs text-jigen-ink-soft">買い切り</span>
          </div>
          <p className="mb-8 max-w-lg text-center text-[11px] text-jigen-ink-mute [text-wrap:balance]">
            <span className="font-bold text-jigen-gold">2026/07/20まで使い放題</span> / サブスクなし・即日学習スタート
          </p>

          {/* CTA */}
          <Link
            href="/auth/signup?beta=1"
            className="group inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-10 text-lg font-extrabold text-jigen-bg-dark shadow-gold-glow-strong transition-all hover:scale-[1.03]"
          >
            β1次プランを購入(¥980 一括)
            <ArrowRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-3 text-[11px] text-jigen-ink-mute">買い切り / 即日学習スタート / Stripe決済</p>
        </div>
      </section>

      {/* ============ 3本柱(β版で必ず体験できるもの) ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">β Features</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              β版で必ず体験できる <span className="text-jigen-gold">3つの強み</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-jigen-ink">初回50問模試</h3>
              <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
                登録後すぐ、 <span className="font-semibold text-jigen-gold">本試験形式の50問</span> で現状診断。
                教科別スコアから初期の弱点プロファイルを生成し、 翌日からの出題が最適化されます。
              </p>
              <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  オリジナル50問・本試験形式
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  教科別合格圏判定
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  弱点プロファイル即時生成
                </li>
              </ul>
            </article>

            <article className="rounded-2xl border-2 border-jigen-warning bg-panel-gradient p-6 shadow-panel">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-jigen-warning/15 text-jigen-warning">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-jigen-ink">
                直前期モード <span className="ml-1 rounded-full bg-jigen-warning/15 px-2 py-0.5 text-[9px] font-bold text-jigen-warning">NEW</span>
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
                試験まで残り日数で出題を <span className="font-semibold text-jigen-warning">自動切替</span>。
                直前30日切ったら間違えリスト中心、 14日切ったら頻出単元のみ。 焦らず最短経路で。
              </p>
              <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-warning" />
                  残り日数で出題比率自動変化
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-warning" />
                  間違えた問題優先のSRS復習
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-warning" />
                  「合格圏まで〇問」 で見える化
                </li>
              </ul>
            </article>

            <article className="rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-jigen-ink">弱点AI出題エンジン</h3>
              <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
                教科×小単元の弱点を統計的に検出。 <span className="font-semibold text-jigen-gold">SRS忘却曲線</span> と
                <span className="font-semibold text-jigen-gold"> ZPD難易度マッチ</span> で、 あなた専用の出題プランを毎日更新。
              </p>
              <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  オリジナル1,455問
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  1問1-2分でスキマ時間消化
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  間違えリスト2連続正解で自動解除
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ============ β完走特典 ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-gradient-to-b from-jigen-bg-dark to-jigen-bg-panel/40 py-20">
        <div className="mx-auto w-full max-w-4xl px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">β Reward</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              β完走者だけの <span className="text-jigen-gold">永久特典</span>
            </h2>
          </div>

          <div className="mx-auto max-w-3xl rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-6 shadow-gold-glow sm:p-10">
            <div className="mb-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.25em] text-jigen-gold">3ヶ月完走で</p>
              <p className="mt-2 text-3xl font-extrabold text-jigen-ink sm:text-4xl">
                以降は <span className="text-jigen-gold">¥1,490/月</span>
              </p>
              <p className="mt-1 text-xs text-jigen-ink-soft">永久ロック(値上げなし)・通常¥2,980から半額</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-4">
                <p className="mb-1 text-xs font-semibold text-jigen-gold">3ヶ月完走の条件</p>
                <ul className="space-y-1 text-[11px] text-jigen-ink-soft">
                  <li className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                    月1回 簡易アンケート(2分)
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                    バグ報告・改善提案 1件以上/月
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                    3ヶ月課金継続
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark/60 p-4">
                <p className="mb-1 text-xs font-semibold text-jigen-gold">完走特典内容</p>
                <ul className="space-y-1 text-[11px] text-jigen-ink-soft">
                  <li className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                    ¥1,490/月 永久ロック
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                    2次経験記述AI添削 先行アクセス
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                    合格体験記 公式掲載(任意)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 価格透明性 ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-16">
        <div className="mx-auto w-full max-w-4xl px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">Pricing</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              価格は、 完全に透明
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-jigen-gold bg-panel-gradient p-6 text-center shadow-gold-glow">
              <p className="text-[10px] uppercase tracking-widest text-jigen-gold">β1次プラン</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-jigen-gold">¥980<span className="ml-1 text-sm font-normal text-jigen-ink-soft">買い切り</span></p>
              <p className="mt-1 text-[11px] text-jigen-ink-soft">2026/07/20まで使い放題</p>
            </div>
            <div className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-6 text-center">
              <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">β2次プラン</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-jigen-ink">¥1,480<span className="ml-1 text-sm font-normal text-jigen-ink-soft">買い切り</span></p>
              <p className="mt-1 text-[11px] text-jigen-ink-soft">2026/10/19まで使い放題</p>
              <p className="mt-2 text-[10px] text-jigen-gold">β1次プラン購入者は ¥980 でアップグレード可能</p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-jigen-ink-mute [text-wrap:balance]">
            ※β版は買い切り(サブスクではない)。 期間内は機能全部使い放題・追加課金なし。 自動で課金が継続される仕組みは一切ありません。
          </p>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden border-t border-jigen-gold/30 bg-gradient-to-b from-jigen-bg-dark via-jigen-bg-panel/30 to-jigen-bg-dark py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,196,65,0.18),transparent_70%)] blur-2xl"
        />
        <div className="relative mx-auto w-full max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-jigen-warning/60 bg-jigen-warning-soft/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-jigen-warning">
            <Users aria-hidden className="h-3.5 w-3.5" />
            限定 {BETA_LIMIT} 名
          </div>
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            <span className="block">残り{dleft}日。</span>
            <span className="block bg-gold-gradient bg-clip-text text-transparent">
              共に駆け抜けよう。
            </span>
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-jigen-ink-soft sm:text-base [text-wrap:balance]">
            2026年7月の1次試験まで{dleft}日。 ジゲンのβ枠で、 あなたの最後の追い込みを共有しませんか。
          </p>
          <Link
            href="/auth/signup?beta=1"
            className="group inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-10 text-lg font-extrabold text-jigen-bg-dark shadow-gold-glow-strong transition-all hover:scale-[1.03] sm:px-14"
          >
            β枠に応募する
            <ArrowRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 text-[11px] text-jigen-ink-mute">
            即日学習スタート / クレジットカード決済 / 解約はワンタップ
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-10">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-extrabold text-jigen-gold">ジゲン β版</p>
              <p className="mt-1 text-[11px] text-jigen-ink-mute">
                2026年7月1次試験 共闘プログラム / 限定 {BETA_LIMIT}名
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-jigen-ink-soft">
              <Link href="/" className="hover:text-jigen-gold">トップ</Link>
              <Link href="/legal/tokushoho" className="hover:text-jigen-gold">特定商取引法</Link>
              <Link href="/legal/privacy" className="hover:text-jigen-gold">プライバシー</Link>
              <Link href="/legal/terms" className="hover:text-jigen-gold">利用規約</Link>
              <Link href="/contact" className="hover:text-jigen-gold">お問い合わせ</Link>
            </div>
          </div>
          <div className="border-t border-jigen-border-soft/40 pt-4 text-[11px] text-jigen-ink-mute">
            <p>運営: 山口竣輔(屋号: ティラノ資格学校) / support@jigen-app.com</p>
            <p className="mt-2">© 2026 ティラノ資格学校. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
