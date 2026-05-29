import Link from 'next/link';
import { PlanCard } from '@/components/billing/PlanCard';
import { getBillingSnapshot } from '@/lib/mock/dashboard-data';

// S12 プラン選択・課金
// ユウ§2-(5) / §5.3:
// - 7日間の成果レポートを冒頭にサマリ
// - 月 / 年 プランを並列・同等装飾(おすすめバッジ等なし)
// - Free に移行リンクも同列・装飾なし
// - クレカ入力は Stripe Checkout に遷移する想定(ここでは入力フォームを置かない)
// - 限定オファー禁止・煽り禁止
export default function BillingPage() {
  const b = getBillingSnapshot();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">これからの学習プラン</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          7 日間の結果と、続けるための選択肢。
        </p>
      </header>

      {/* 7日間の成果レポート(サマリ)*/}
      <section
        aria-label="7日間の成果"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          7 日間の成果
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">解いた問題</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {b.report.solvedCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">問</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">正答率</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {b.report.accuracyPct}
              <span className="ml-1 text-sm font-normal text-muted-foreground">%</span>
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          <p className="text-muted-foreground">
            伸びた分野: <span className="text-foreground">{b.report.improvedFields.join(' / ')}</span>
          </p>
          <p className="text-muted-foreground">
            今のペースで合格圏に届く確度:{' '}
            <span className="text-foreground tabular-nums">{b.report.projectedReach}%</span>
          </p>
        </div>
      </section>

      {/* プラン(並列)*/}
      <section aria-label="プラン" className="grid gap-3 sm:grid-cols-2">
        {b.plans.map((p) => (
          <PlanCard key={p.id} plan={p} checkoutHref={`/api/billing/checkout?plan=${p.id}`} />
        ))}
      </section>

      {/* Free 継続 — 同列・装飾なし */}
      <section aria-label="そのほかの選択肢" className="flex flex-col items-center gap-2 pt-1">
        <Link
          href={b.freeHref}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Free に移行して続ける
        </Link>
        <p className="text-xs text-muted-foreground">
          Free でも開けます。月内のいつでも戻れます。
        </p>
      </section>

      {/* クレカ入力は次画面 */}
      <section
        aria-label="支払い情報について"
        className="rounded-xl border bg-secondary/60 p-5"
      >
        <p className="text-sm font-medium">この画面ではクレカは入力しません</p>
        <p className="mt-1 text-sm text-muted-foreground">
          プランを選ぶと、決済画面(Stripe)に移ります。そこで安全に入力できます。
        </p>
      </section>

      {/* 解約導線(同列)*/}
      <section id="cancel" aria-label="解約" className="pt-2 text-center">
        <Link
          href="/api/billing/cancel"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          解約について
        </Link>
      </section>
    </div>
  );
}
