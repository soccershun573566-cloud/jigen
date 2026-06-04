// LP(2026-06-04 ティラノCEO刷新)
// - ダーク+ゴールド高級感
// - 正式コンセプト「あなたの時間・ペースに合わせて合格までサポートする、資格取得のためのAI伴走パートナー」を反映
// - 受験者ペイン共感 → AI3本柱 → ロジック透明性 → 競合比較 → 料金 → CTA
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Clock,
  MessageSquare,
  Moon,
  Pencil,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

export const metadata: Metadata = {
  title: 'ジゲン | 1級建築施工管理技士のためのAI伴走パートナー',
  description:
    '「あなたの時間・ペースに合わせて合格までサポートする、資格取得のためのAI伴走パートナー」。弱点AI出題・SRS忘却曲線・経験記述添削・24時間チャットで、夜の机に伴走者を。月¥2,980・7日無料・クレカ不要。',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-jigen-bg-dark text-jigen-ink">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        {/* 背景装飾: ゴールドの放射光 */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,196,65,0.18),transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[400px] w-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(245,196,65,0.10),transparent_70%)] blur-3xl"
        />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-20 pt-16 sm:pt-24">
          {/* ロゴ・ナビ */}
          <nav className="absolute left-6 right-6 top-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-jigen-gold">
                ジゲン
              </span>
              <span className="hidden text-[10px] uppercase tracking-[0.3em] text-jigen-ink-mute sm:inline">
                JIGEN
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/auth/login"
                className="text-xs text-jigen-ink-soft hover:text-jigen-gold sm:text-sm"
              >
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full border border-jigen-gold/50 px-3 py-1.5 text-xs font-semibold text-jigen-gold hover:bg-jigen-gold/10 sm:px-4 sm:text-sm"
              >
                無料で試す
              </Link>
            </div>
          </nav>

          {/* ティラノ先生 */}
          <div className="mt-8 mb-6">
            <TiranoSensei size="xl" glow />
          </div>

          {/* 上部キャッチ(小) */}
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-jigen-gold/30 bg-jigen-bg-panel/60 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-jigen-gold backdrop-blur">
            <Sparkles aria-hidden className="h-3 w-3" />
            1級建築施工管理技士 / AI Companion
          </p>

          {/* メインコピー */}
          <h1 className="mb-5 text-center text-[34px] font-extrabold leading-[1.15] tracking-tight text-jigen-ink sm:text-5xl md:text-6xl">
            夜の机に、
            <br className="sm:hidden" />
            <span className="bg-gold-gradient bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,196,65,0.35)]">
              AIの伴走者を。
            </span>
          </h1>

          {/* コンセプト文 */}
          <p className="mb-8 max-w-2xl text-center text-base leading-relaxed text-jigen-ink-soft sm:text-lg">
            あなたの時間・ペースに合わせて
            <span className="font-semibold text-jigen-ink">合格までサポート</span>
            する、
            <br className="hidden sm:inline" />
            資格取得のための
            <span className="font-semibold text-jigen-gold">AI伴走パートナー</span>。
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-8 text-base font-bold text-jigen-bg-dark shadow-gold-glow transition-all hover:scale-[1.02] hover:shadow-gold-glow-strong sm:px-10"
            >
              7日間無料で始める
              <ArrowRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-[11px] text-jigen-ink-mute">
              クレジットカードの登録は不要
            </p>
          </div>

          {/* 信頼バッジ */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] text-jigen-ink-mute">
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              オリジナル1,455問
            </span>
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              解約はワンタップ
            </span>
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              押し売り電話ゼロ
            </span>
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              スマホ完結
            </span>
          </div>
        </div>
      </section>

      {/* ============ PAIN: こんな夜ありませんか ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              The Problem
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              こんな夜、ありませんか。
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: <Moon className="h-5 w-5" />,
                title: '残業から帰った23時の机',
                body: '「勉強しなきゃ」と思いながら、体が動かない。今日もできなかった自分への嫌悪が、また積もる夜。',
              },
              {
                icon: <TrendingDown className="h-5 w-5" />,
                title: '「どこを直せば受かるか分からない」',
                body: '過去問は何周もした。なのに、自分の現在地と合格圏の距離が見えない。走る方向すら分からないまま、ただ毎日教材を開いている。',
              },
              {
                icon: <MessageSquare className="h-5 w-5" />,
                title: '質問できない孤独',
                body: '通信講座の質問対応は遅い。家族や同期には言えない不安。「自分だけが取り残されている」気持ちが、毎日少しずつ重くなる。',
              },
              {
                icon: <Pencil className="h-5 w-5" />,
                title: '経験記述で、また詰む',
                body: '3年前の現場の数字なんて覚えていない。文章を書く訓練もしていない。添削サービスは1テーマ3,500円。自分の拙い文章を晒すのも恥ずかしい。',
              },
            ].map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel/60 p-6 backdrop-blur transition-colors hover:border-jigen-gold/40"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-jigen-gold/40 bg-jigen-bg-dark text-jigen-gold">
                  {p.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-jigen-ink">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-jigen-ink-soft">
                  {p.body}
                </p>
              </article>
            ))}
          </div>

          {/* 30字要約 */}
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-jigen-gold/30 bg-panel-gradient p-5 text-center shadow-panel">
            <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-ink-mute">
              受験者の心境を、ぎゅっと
            </p>
            <p className="mt-2 text-base font-bold text-jigen-gold sm:text-lg">
              「疲弊と孤独の中、向かう先が見えぬまま<br />
              自己嫌悪を抱える夜の机で。」
            </p>
          </div>
        </div>
      </section>

      {/* ============ SOLUTION: 3本柱 ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              The Solution
            </p>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              AIが、あなたの代わりに走ります。
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-jigen-ink-soft sm:text-base">
              弱点を見つけるのも、忘れた頃に思い出させるのも、経験記述を磨くのも、夜中に話を聞くのも。
              <br />
              <span className="text-jigen-gold">あなたは、解くだけ。</span>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 柱1: 一次AI演習 */}
            <article className="group relative overflow-hidden rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel">
              <div className="absolute right-3 top-3 text-[9px] uppercase tracking-widest text-jigen-ink-mute">
                Pillar 01
              </div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-jigen-ink">
                一次AI演習
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
                教科×小単元の<span className="font-semibold text-jigen-gold">弱点重み出題</span>、
                <span className="font-semibold text-jigen-gold">SRS忘却曲線</span>、
                <span className="font-semibold text-jigen-gold">ZPD難易度マッチ</span>、
                <span className="font-semibold text-jigen-gold">試験日フェーズ判定</span>。
                AIが今日のあなただけのカリキュラムを毎日更新します。
              </p>
              <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  オリジナル1,455問(過去問依存ゼロ・著作権リスクなし)
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  1問1〜2分、5問先読みで瞬間切替
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  間違えリスト 2連続正解で自動解除
                </li>
              </ul>
            </article>

            {/* 柱2: 二次AI添削 */}
            <article className="group relative overflow-hidden rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel">
              <div className="absolute right-3 top-3 text-[9px] uppercase tracking-widest text-jigen-ink-mute">
                Pillar 02
              </div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
                <Pencil className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-jigen-ink">
                二次AI添削
                <span className="ml-2 rounded-full bg-jigen-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-jigen-gold">
                  Coming
                </span>
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
                業界最大のペイン、<span className="font-semibold text-jigen-gold">経験記述</span>を AI が添削。
                工種別テンプレ、令和6年度改訂対応の条件チェック、文章を晒さない匿名性。
              </p>
              <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  別売¥3,500/テーマが、月額に込み
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  24時間即時応答・待たない
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  「条件満たしてるか」を可視化
                </li>
              </ul>
            </article>

            {/* 柱3: ティラノ先生チャット */}
            <article className="group relative overflow-hidden rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel">
              <div className="absolute right-3 top-3 text-[9px] uppercase tracking-widest text-jigen-ink-mute">
                Pillar 03
              </div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-jigen-gold/15 text-jigen-gold">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-jigen-ink">
                ティラノ先生チャット
                <span className="ml-2 rounded-full bg-jigen-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-jigen-gold">
                  Coming
                </span>
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
                解説に「もう少し詳しく」を押すと、問題の文脈を理解した
                <span className="font-semibold text-jigen-gold">深掘り回答</span>が即座に。
                夜中の机にいる、あなたの相棒。
              </p>
              <ul className="space-y-1.5 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  24時間対話可能・待たない
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  学習計画相談・モチベ相談もOK
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-jigen-gold" />
                  テキスト引用じゃない、自分の文脈で答える
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ============ TRANSPARENCY: AIが何を考えているか ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-gradient-to-b from-jigen-bg-dark to-jigen-bg-panel/40 py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              Transparency
            </p>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              ブラックボックスにしません。
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-jigen-ink-soft sm:text-base">
              「なぜこの問題が出ているのか」「今日の戦略は何か」を、ジゲンは画面で見せます。
              <br />
              AIが何を考えているかが分かるから、安心して任せられる。
            </p>
          </div>

          {/* AIロジック 4 ステップ */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: '弱点重み出題',
                formula: 'max(0.2, 1 − 正答率)',
                body: '教科×小単元ごとの正答率から、弱点ほど高い重みで出題。',
              },
              {
                step: '02',
                title: 'SRS忘却曲線',
                formula: '1日→3日→7日→14日→30日→60日',
                body: '連続正解数に応じて、忘れる前に最適なタイミングで再出題。',
              },
              {
                step: '03',
                title: 'ZPD難易度マッチ',
                formula: '目標 = 生徒正答率 − 10%',
                body: '簡単すぎず難しすぎず、ちょい難の問題を優先。集中が切れない。',
              },
              {
                step: '04',
                title: '試験日フェーズ判定',
                formula: '基礎 → 弱点強化 → 直前',
                body: '残り日数で出題比率が自動変化。今やるべきことが、AIで分かる。',
              },
            ].map((s) => (
              <article
                key={s.step}
                className="rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-jigen-gold">
                    Step {s.step}
                  </span>
                  <Brain aria-hidden className="h-4 w-4 text-jigen-gold/60" />
                </div>
                <h3 className="mb-2 text-sm font-bold text-jigen-ink">
                  {s.title}
                </h3>
                <p className="mb-2 rounded-md border border-jigen-gold/20 bg-jigen-bg-dark/60 px-2 py-1 font-mono text-[11px] text-jigen-gold">
                  {s.formula}
                </p>
                <p className="text-xs leading-relaxed text-jigen-ink-soft">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMPARE: 競合との位置 ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              Compare
            </p>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              通学型の<span className="text-jigen-gold">1/29</span>の価格で。
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-jigen-ink-soft">
              「確実だけど高すぎる」通学型と、「安いけど内容が薄い」無料アプリ。
              その間を、ジゲンが埋めます。
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel shadow-panel">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-jigen-border-soft bg-jigen-bg-dark/60">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-jigen-ink-soft sm:px-5">サービス</th>
                  <th className="px-3 py-3 text-right font-semibold text-jigen-ink-soft sm:px-5">価格(年額)</th>
                  <th className="hidden px-5 py-3 text-center font-semibold text-jigen-ink-soft md:table-cell">AI出題</th>
                  <th className="hidden px-5 py-3 text-center font-semibold text-jigen-ink-soft md:table-cell">経験記述</th>
                  <th className="hidden px-5 py-3 text-center font-semibold text-jigen-ink-soft md:table-cell">押し売り</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jigen-border-soft/60">
                <tr>
                  <td className="px-3 py-3 sm:px-5">総合資格学院(通学)</td>
                  <td className="px-3 py-3 text-right tabular-nums text-jigen-ink-mute sm:px-5">715,000円</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-mute md:table-cell">—</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-soft md:table-cell">○</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-warning md:table-cell">あり</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 sm:px-5">日建学院(通学)</td>
                  <td className="px-3 py-3 text-right tabular-nums text-jigen-ink-mute sm:px-5">605,000円</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-mute md:table-cell">—</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-soft md:table-cell">○</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-warning md:table-cell">あり</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 sm:px-5">SAT / アガルート(オンライン)</td>
                  <td className="px-3 py-3 text-right tabular-nums text-jigen-ink-mute sm:px-5">約82,000円</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-mute md:table-cell">△</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-soft md:table-cell">○(別料金)</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-soft md:table-cell">ほぼなし</td>
                </tr>
                <tr className="border-y-2 border-jigen-gold/60 bg-jigen-gold/[0.06]">
                  <td className="px-3 py-3 font-bold text-jigen-gold sm:px-5">
                    ★ ジゲン
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold tabular-nums text-jigen-gold sm:px-5">24,800円</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-gold md:table-cell">◎</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-gold md:table-cell">◎(月額に込み)</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-gold md:table-cell">ゼロ</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 sm:px-5">過去問.com(無料)</td>
                  <td className="px-3 py-3 text-right tabular-nums text-jigen-ink-mute sm:px-5">0円</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-mute md:table-cell">×</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-mute md:table-cell">×</td>
                  <td className="hidden px-5 py-3 text-center text-jigen-ink-mute md:table-cell">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-[10px] text-jigen-ink-mute">
            ※2026-06時点の各社公開情報に基づく。通学型は標準コース、オンラインは一次+二次合計の参考価格。
          </p>
        </div>
      </section>

      {/* ============ VOICE: 受験者の声(プレースホルダ) ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              Voices
            </p>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              受験者のリアルな声から、設計しました。
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-jigen-ink-soft">
              X・Yahoo!知恵袋・note・ブログから1,000件以上の肉声を読み込み、
              本当に欲しかったものを言語化しました。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                quote: '勉強したいのはやまやまだが、現場が終わったら体が動かない。日曜だけが唯一の休日で、その休日すら天候不良の対応や急な打ち合わせで消えることがある。',
                attr: '— note, 現場監督',
              },
              {
                quote: '正直、「なぜ落ちたのか分からない」というよりも「どこを直せば受かるのか分からない」という状態でした。',
                attr: '— note, 1点差不合格者',
              },
              {
                quote: '春から社会人です。1級施工管理技士を7月の一次試験に合格したいです。大学はfランで、ほぼ初心者です。',
                attr: '— Yahoo!知恵袋',
              },
              {
                quote: '何度断っても繰り返し営業電話をかけてきます。断り続けてもう4年目です。本当に鬱陶しいです。',
                attr: '— Yahoo!知恵袋, 資格学校への嫌悪',
              },
            ].map((v) => (
              <blockquote
                key={v.quote}
                className="relative rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel/70 p-6"
              >
                <Quote aria-hidden className="absolute right-4 top-4 h-5 w-5 text-jigen-gold/40" />
                <p className="mb-3 text-sm leading-relaxed text-jigen-ink">
                  「{v.quote}」
                </p>
                <footer className="text-[11px] text-jigen-ink-mute">{v.attr}</footer>
              </blockquote>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-jigen-ink-mute">
            これらの声に応えるために、ジゲンを作りました。
          </p>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-gradient-to-b from-jigen-bg-dark via-jigen-bg-panel/30 to-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              Pricing
            </p>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              失敗しても、痛くない価格で。
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-jigen-ink-soft">
              「お金払ったのに進まなかった」自己嫌悪から、あなたを守ります。
              7日間無料・クレカ不要・解約はワンタップ。
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* 月額 */}
            <article className="relative rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-6 shadow-panel">
              <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-jigen-ink-mute">
                月額プラン
              </p>
              <p className="mb-4 text-4xl font-extrabold tabular-nums">
                ¥2,980<span className="ml-1 text-sm font-normal text-jigen-ink-soft">/月</span>
              </p>
              <ul className="mb-6 space-y-2 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                  まずは月単位で試したい方向け
                </li>
                <li className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                  全機能アクセス可能
                </li>
                <li className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                  いつでもワンタップ解約
                </li>
              </ul>
            </article>

            {/* 年額(推奨) */}
            <article className="relative overflow-hidden rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-6 shadow-gold-glow">
              <span className="absolute right-4 top-4 rounded-full bg-gold-gradient px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-bg-dark">
                おすすめ
              </span>
              <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-jigen-gold">
                年額プラン
              </p>
              <p className="mb-1 text-4xl font-extrabold tabular-nums">
                ¥24,800<span className="ml-1 text-sm font-normal text-jigen-ink-soft">/年</span>
              </p>
              <p className="mb-4 text-xs text-jigen-ink-soft">
                月換算 <span className="font-semibold text-jigen-gold">¥2,067</span>(月額比 30%お得)
              </p>
              <ul className="mb-6 space-y-2 text-xs text-jigen-ink-soft">
                <li className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                  本気で合格を目指す方向け
                </li>
                <li className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                  試験日逆算フェーズ判定が真価を発揮
                </li>
                <li className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                  通学型の <span className="font-bold text-jigen-gold">1/29</span> の価格
                </li>
              </ul>
            </article>
          </div>

          {/* リスク低減 */}
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-xl border border-jigen-gold/30 bg-jigen-bg-panel/40 p-4 text-[11px] text-jigen-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              7日間完全無料
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              クレジットカード登録不要
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              いつでもワンタップ解約
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
              電話勧誘ゼロ
            </span>
          </div>
        </div>
      </section>

      {/* ============ STORY: なぜ作ったか ============ */}
      <section className="relative border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-20">
        <div className="mx-auto w-full max-w-3xl px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-jigen-gold">
              Our Story
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              なぜ、ジゲンを作ったか。
            </h2>
          </div>

          <div className="rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-8 shadow-panel">
            <div className="mb-6 flex items-center gap-4">
              <TiranoSensei size="md" glow />
              <div>
                <p className="text-xs uppercase tracking-widest text-jigen-gold">CEO / Founder</p>
                <p className="text-lg font-bold text-jigen-ink">ティラノ先生</p>
              </div>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
              施工管理職の受験者の肉声を、何百件も読みました。
              「現場が終わったら体が動かない」「どこを直せば受かるか分からない」「夜の机で一人」。
              共通していたのは、<span className="font-semibold text-jigen-ink">「誰かそばにいてくれたら」</span>という気持ちでした。
            </p>
            <p className="mb-4 text-sm leading-relaxed text-jigen-ink-soft">
              通学型は高すぎる。動画講座は見るだけになる。無料アプリは進捗が見えない。
              既存のどれも、「夜の机に置かれた、もう一人の存在」にはなれていなかった。
            </p>
            <p className="text-sm font-semibold leading-relaxed text-jigen-gold">
              ジゲンは、その隣に座る存在でありたい。
            </p>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden border-t border-jigen-gold/30 bg-gradient-to-b from-jigen-bg-dark via-jigen-bg-panel/30 to-jigen-bg-dark py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,196,65,0.15),transparent_70%)] blur-2xl"
        />
        <div className="relative mx-auto w-full max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            夜の机に、
            <br className="sm:hidden" />
            <span className="bg-gold-gradient bg-clip-text text-transparent">
              AIの伴走者を。
            </span>
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-jigen-ink-soft sm:text-base">
            あなたの時間・ペースに合わせて、合格まで。
            <br />
            まずは7日間、無料で体験してみてください。
          </p>
          <Link
            href="/auth/signup"
            className="group inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-10 text-lg font-extrabold text-jigen-bg-dark shadow-gold-glow-strong transition-all hover:scale-[1.03] sm:px-14"
          >
            7日間無料で始める
            <ArrowRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 text-[11px] text-jigen-ink-mute">
            クレジットカードの登録は不要 / 1分で完了
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-jigen-border-soft/40 bg-jigen-bg-dark py-10">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-extrabold text-jigen-gold">ジゲン</p>
              <p className="mt-1 text-[11px] text-jigen-ink-mute">
                資格取得のためのAI伴走パートナー
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-jigen-ink-soft">
              <Link href="/about" className="hover:text-jigen-gold">運営者情報</Link>
              <Link href="/contact" className="hover:text-jigen-gold">お問い合わせ</Link>
              <Link href="/legal/tokushoho" className="hover:text-jigen-gold">特定商取引法</Link>
              <Link href="/legal/privacy" className="hover:text-jigen-gold">プライバシー</Link>
              <Link href="/legal/terms" className="hover:text-jigen-gold">利用規約</Link>
            </div>
          </div>
          <div className="border-t border-jigen-border-soft/40 pt-4 text-[11px] text-jigen-ink-mute">
            <p>運営: 山口竣輔(屋号: ティラノ資格学校)</p>
            <p className="mt-1">〒150-0043 東京都渋谷区道玄坂1丁目10番8号 渋谷道玄坂東急ビル2F-C</p>
            <p className="mt-2">© 2026 ティラノ資格学校. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
