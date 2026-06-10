// /billing — プラン選択 & 購読/ライセンス管理(2026-06-08 大刷新)
// β版は買い切り(licenses)、 通常版はサブスク(subscriptions)で別管理
import { sql } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, Check, ShieldCheck, Sparkles } from 'lucide-react';
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
};
type LicenseRow = {
  plan_type: 'beta_first' | 'beta_second_new' | 'beta_second_upgrade';
  valid_until: string;
  paid_amount: number;
  paid_at: string;
};

async function getSubscription(userId: string): Promise<SubRow | null> {
  try {
    const r = await db.execute(sql`
      select plan, status, trial_ends_at, current_period_end
      from subscriptions where user_id = ${userId}::uuid limit 1
    `);
    const rows = (r as unknown as { rows?: SubRow[] }).rows ?? (r as unknown as SubRow[]);
    return rows?.[0] ?? null;
  } catch { return null; }
}

async function getActiveLicenses(userId: string): Promise<LicenseRow[]> {
  try {
    const r = await db.execute(sql`
      select plan_type, valid_until, paid_amount, paid_at
      from licenses
      where user_id = ${userId}::uuid and valid_until > now()
      order by valid_until desc
    `);
    const rows = (r as unknown as { rows?: LicenseRow[] }).rows ?? (r as unknown as LicenseRow[]);
    return rows ?? [];
  } catch { return []; }
}

function licensePlanLabel(plan: string): string {
  if (plan === 'beta_first') return '試験直前ver(1次)';
  if (plan === 'beta_second_new') return '試験直前ver(2次)';
  if (plan === 'beta_second_upgrade') return '試験直前ver(2次・1次購入者向け)';
  return plan;
}

function fmt(ts: string | null): string {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ts; }
}

function statusLabel(s: string): { label: string; tone: 'gold' | 'warn' | 'mute' } {
  if (s === 'trialing') return { label: '無料トライアル中', tone: 'gold' };
  if (s === 'active') return { label: '有効', tone: 'gold' };
  if (s === 'past_due') return { label: '支払い保留中', tone: 'warn' };
  if (s === 'canceled') return { label: '解約済み', tone: 'mute' };
  return { label: 'フリープラン', tone: 'mute' };
}

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [sub, licenses] = await Promise.all([
    getSubscription(user.id),
    getActiveLicenses(user.id),
  ]);

  const hasBetaFirst = licenses.some(l => l.plan_type === 'beta_first');
  const hasBetaSecond = licenses.some(l => l.plan_type === 'beta_second_new' || l.plan_type === 'beta_second_upgrade');
  const subActive = sub && ['trialing', 'active', 'past_due'].includes(sub.status);
  const status = statusLabel(sub?.status ?? 'free');

  // 何らかの有効プランがあるか
  const hasAnyActive = subActive || licenses.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 text-jigen-ink">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-wide text-jigen-ink drop-shadow-[0_0_10px_rgba(245,196,65,0.25)]">プラン管理</h1>
        <p className="mt-1 text-sm font-medium text-jigen-ink">あなたの時間・ペースで合格まで。</p>
      </div>

      {/* 現在の有効プラン一覧 */}
      {hasAnyActive ? (
        <section className="mb-6 space-y-3">
          {licenses.map((l, i) => (
            <article key={i} className="rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel">
              <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-ink-mute">買い切りプラン</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-lg font-bold text-jigen-ink">{licensePlanLabel(l.plan_type)}</p>
                <span className="rounded-full bg-jigen-gold/15 px-3 py-0.5 text-xs font-semibold text-jigen-gold">有効</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-jigen-ink">
                <span className="inline-flex items-center gap-1">
                  <Calendar aria-hidden className="h-3.5 w-3.5 text-jigen-gold" />
                  有効期限: <span className="font-bold">{fmt(l.valid_until)}</span>
                </span>
                <span>購入額: <span className="font-bold text-jigen-gold">¥{l.paid_amount.toLocaleString()}</span></span>
                <span>購入日: {fmt(l.paid_at)}</span>
              </div>
            </article>
          ))}
          {subActive && sub ? (
            <article className="rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel">
              <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-ink-mute">サブスクリプション</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-lg font-bold text-jigen-ink">
                  {sub.plan === 'yearly' ? '年額プラン' : '月額プラン'}
                </p>
                <span className={
                  'rounded-full px-3 py-0.5 text-xs font-semibold ' +
                  (status.tone === 'gold' ? 'bg-jigen-gold/15 text-jigen-gold' :
                   status.tone === 'warn' ? 'bg-jigen-warning/15 text-jigen-warning' :
                   'bg-jigen-bg-panel-2 text-jigen-ink-mute')
                }>{status.label}</span>
              </div>
              {sub.status === 'trialing' && sub.trial_ends_at ? (
                <p className="mt-3 text-xs text-jigen-ink">無料期間は <span className="font-semibold text-jigen-gold">{fmt(sub.trial_ends_at)}</span> まで</p>
              ) : null}
              {sub.current_period_end && sub.status !== 'trialing' ? (
                <p className="mt-3 text-xs text-jigen-ink">次回更新日: <span className="font-semibold">{fmt(sub.current_period_end)}</span></p>
              ) : null}
              <div className="mt-4"><CancelButton /></div>
            </article>
          ) : null}
        </section>
      ) : null}

      {/* 試験直前ver 1次を持ってる人向け 2次アップグレード提案 */}
      {hasBetaFirst && !hasBetaSecond ? (
        <section className="mb-6 rounded-2xl border-2 border-jigen-gold bg-panel-gradient p-6 shadow-gold-glow">
          <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-gold">試験直前ver(1次) 購入者特典</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight">試験直前ver(2次) を ¥1,500で(通常¥2,000)</h2>
          <p className="mt-2 text-sm text-jigen-ink">2次試験(2026/10/19)までの完全サポート。 経験記述AI添削は2026/07/20より提供開始。</p>
          <div className="mt-4">
            <CheckoutButton plan="beta_second_upgrade" label="2次プランに進む(¥1,500)" />
          </div>
        </section>
      ) : null}

      {/* プラン選択(有効プラン無しの場合のみ) */}
      {!hasAnyActive ? (
        <>
          <section className="mb-3 rounded-xl border border-jigen-warning/50 bg-jigen-warning-soft/15 p-4">
            <p className="text-sm font-bold text-jigen-warning">直前駆け込み層向け 試験直前ver 残席あり</p>
            <p className="mt-1 text-xs font-medium text-jigen-ink">¥1,500 一括で 2026/07/20 まで使い放題。 サブスク不要。</p>
          </section>

          <section className="mb-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border-2 border-jigen-warning bg-panel-gradient p-6 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
              <span className="inline-block rounded-full bg-jigen-warning/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-warning">試験直前ver / 1次</span>
              <p className="mt-2 text-4xl font-extrabold tabular-nums">¥1,500<span className="ml-1 text-sm font-normal text-jigen-ink">一括</span></p>
              <p className="mt-1 text-xs font-medium text-jigen-ink">2026/07/20まで使い放題</p>
              <ul className="mb-5 mt-4 space-y-1.5 text-xs text-jigen-ink">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-jigen-gold" />1次対策の全機能アクセス</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-jigen-gold" />初回50問模試 + 直前模試(7/1〜)</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-jigen-gold" />無料期間なし・即日開始</li>
              </ul>
              <CheckoutButton plan="beta_first" label="試験直前ver(1次) を購入(¥1,500)" />
            </article>

            <article className="rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-6">
              <span className="inline-block rounded-full bg-jigen-bg-panel-2 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jigen-ink-mute">試験直前ver / 2次</span>
              <p className="mt-2 text-4xl font-extrabold tabular-nums">¥2,000<span className="ml-1 text-sm font-normal text-jigen-ink">一括</span></p>
              <p className="mt-1 text-xs font-medium text-jigen-ink">2026/10/19まで使い放題</p>
              <ul className="mb-5 mt-4 space-y-1.5 text-xs text-jigen-ink">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-jigen-gold" />1次 + 2次 両方の全機能</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-jigen-gold" />経験記述AI添削(2026/07/20より提供)</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-jigen-gold" />1次プラン購入者は ¥1,500で利用可</li>
              </ul>
              <CheckoutButton plan="beta_second_new" label="試験直前ver(2次) を購入(¥2,000)" />
            </article>
          </section>

          {/* 通常サブスクは折りたたんで控えめに */}
          <details className="mb-6 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-5">
            <summary className="cursor-pointer text-sm font-semibold text-jigen-ink">サブスクリプション(月額/年額)で続けたい方</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-jigen-border-soft bg-jigen-bg-dark p-4">
                <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">月額</p>
                <p className="mt-1 text-2xl font-bold">¥2,980<span className="text-xs font-normal text-jigen-ink">/月</span></p>
                <p className="mb-3 text-[11px] text-jigen-ink">7日間無料・期間内解約で課金なし</p>
                <CheckoutButton plan="monthly" label="月額で始める" />
              </div>
              <div className="rounded-lg border border-jigen-gold/40 bg-jigen-bg-dark p-4">
                <p className="text-[10px] uppercase tracking-widest text-jigen-gold">年額(30%お得)</p>
                <p className="mt-1 text-2xl font-bold">¥24,800<span className="text-xs font-normal text-jigen-ink">/年</span></p>
                <p className="mb-3 text-[11px] text-jigen-ink">7日間無料・月換算¥2,067</p>
                <CheckoutButton plan="yearly" label="年額で始める" />
              </div>
            </div>
          </details>
        </>
      ) : null}

      {/* リスク低減バッジ */}
      <section className="mb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-jigen-gold/30 bg-jigen-bg-panel p-4 text-[12px] font-medium text-jigen-ink">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-jigen-gold" />Stripe決済(PCI DSS準拠)</span>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-jigen-gold" />電話勧誘ゼロ</span>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-jigen-gold" />即日学習スタート</span>
      </section>

      <section className="flex flex-col items-center gap-2 pt-2 text-center">
        <Link href="/home" className="inline-flex h-11 items-center justify-center rounded-xl border border-jigen-gold/40 bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink hover:border-jigen-gold hover:bg-jigen-bg-panel-2">
          <Sparkles className="mr-1 h-4 w-4" />ホームへ戻る
        </Link>
      </section>
    </main>
  );
}
