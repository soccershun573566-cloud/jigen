// /billing — プラン選択&購読管理(ジゲンブランド)
// - 月額/年額の2プラン
// - 7日無料トライアル明示
// - 現在の契約状態表示
// - 解約導線
import { sql } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, ShieldCheck, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { CheckoutButton } from '@/components/billing/CheckoutButton';
import { CancelButton } from '@/components/billing/CancelButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SubRow = {
  plan: 'monthly' | 'yearly' | 'free';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
};

async function getSubscription(userId: string): Promise<SubRow | null> {
  try {
    const r = await db.execute(sql`
      select plan, status, trial_ends_at, current_period_end, canceled_at
      from subscriptions where user_id = ${userId}::uuid limit 1
    `);
    const rows = (r as unknown as { rows?: SubRow[] }).rows ?? (r as unknown as SubRow[]);
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

function planLabel(plan: string): string {
  if (plan === 'monthly') return '月額プラン';
  if (plan === 'yearly') return '年額プラン';
  return 'フリープラン';
}

function statusLabel(s: string): { label: string; tone: 'gold' | 'warn' | 'mute' } {
  if (s === 'trialing') return { label: '無料トライアル中', tone: 'gold' };
  if (s === 'active') return { label: '有効', tone: 'gold' };
  if (s === 'past_due') return { label: '支払い保留中', tone: 'warn' };
  if (s === 'canceled') return { label: '解約済み', tone: 'mute' };
  return { label: 'フリープラン', tone: 'mute' };
}

function fmt(ts: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return ts;
  }
}

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const sub = await getSubscription(user.id);
  const active = sub && ['trialing', 'active', 'past_due'].includes(sub.status);
  const status = statusLabel(sub?.status ?? 'free');

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-wide text-jigen-ink drop-shadow-[0_0_8px_rgba(245,196,65,0.25)]">
          プラン管理
        </h1>
        <p className="mt-1 text-sm text-jigen-ink-soft">
          ジゲンの全機能を、 あなたの時間・ペースで。
        </p>
      </div>

      {/* 現在の契約状態 */}
      <section className="mb-6 rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel">
        <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-ink-mute">
          現在の契約
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-lg font-bold text-jigen-ink">
            {planLabel(sub?.plan ?? 'free')}
          </p>
          <span
            className={
              'rounded-full px-3 py-0.5 text-xs font-semibold ' +
              (status.tone === 'gold'
                ? 'bg-jigen-gold/15 text-jigen-gold'
                : status.tone === 'warn'
                  ? 'bg-jigen-warning/15 text-jigen-warning'
                  : 'bg-jigen-bg-panel-2 text-jigen-ink-mute')
            }
          >
            {status.label}
          </span>
        </div>
        {sub?.status === 'trialing' && sub.trial_ends_at ? (
          <p className="mt-3 text-xs text-jigen-ink-soft">
            無料期間は <span className="font-semibold text-jigen-gold">{fmt(sub.trial_ends_at)}</span> まで。 以降は自動的に有料プランへ移行します。
          </p>
        ) : null}
        {sub?.current_period_end && sub.status !== 'trialing' ? (
          <p className="mt-3 text-xs text-jigen-ink-soft">
            次回更新日: <span className="font-semibold text-jigen-ink">{fmt(sub.current_period_end)}</span>
          </p>
        ) : null}
      </section>

      {/* プラン選択(契約なし or フリーのみ) */}
      {!active ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-2">
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
                全機能アクセス
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                7日間無料(クレカ登録は必要・期間内解約で課金なし)
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                いつでもワンタップ解約
              </li>
            </ul>
            <CheckoutButton plan="monthly" />
          </article>

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
              月換算 <span className="font-semibold text-jigen-gold">¥2,067</span> (30%お得)
            </p>
            <ul className="mb-6 space-y-2 text-xs text-jigen-ink-soft">
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                全機能アクセス
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                7日間無料(期間内解約で課金なし)
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                試験日逆算フェーズ判定の真価
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jigen-gold" />
                通学型の最大1/29の価格
              </li>
            </ul>
            <CheckoutButton plan="yearly" />
          </article>
        </section>
      ) : null}

      {/* リスク低減バッジ */}
      <section className="mb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-jigen-gold/30 bg-jigen-bg-panel/40 p-4 text-[11px] text-jigen-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
          7日間完全無料
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
          いつでも解約可
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
          電話勧誘ゼロ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
          Stripe決済(PCI DSS準拠)
        </span>
      </section>

      {/* 解約セクション */}
      {active ? (
        <section className="mb-6 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel/60 p-5">
          <p className="text-sm font-bold text-jigen-ink">解約について</p>
          <p className="mt-2 text-xs text-jigen-ink-soft">
            解約しても、 次回更新日まではすべての機能をご利用いただけます。
            <br />
            無料トライアル期間中の解約なら、 一切の課金は発生しません。
          </p>
          <div className="mt-4">
            <CancelButton />
          </div>
        </section>
      ) : null}

      {/* ナビ */}
      <section className="flex flex-col items-center gap-2 pt-2 text-center">
        <Link
          href="/home"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink shadow-panel hover:border-jigen-gold hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
        >
          <Sparkles aria-hidden className="mr-1 h-4 w-4" />
          ホームへ戻る
        </Link>
      </section>
    </main>
  );
}
