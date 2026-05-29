import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatJpy } from '@/lib/utils';
import type { BillingPlan } from '@/lib/mock/dashboard-data';

// S12 プランカード
// ユウ§2-(5) / §5.3: 月・年プランを「並列」「同等装飾」で表示。
// 「おすすめ」「限定」「今だけ」バッジは付けない(原則禁止)。
type Props = {
  plan: BillingPlan;
  /** Stripe Checkout への遷移先(モック: クエリでプラン識別)*/
  checkoutHref: string;
};

export function PlanCard({ plan, checkoutHref }: Props) {
  return (
    <article
      aria-labelledby={`plan-${plan.id}-label`}
      className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
    >
      <p
        id={`plan-${plan.id}-label`}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {plan.label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <p className="text-3xl font-bold tabular-nums">{formatJpy(plan.priceJpy)}</p>
        <p className="text-sm text-muted-foreground">/ {plan.cycle}</p>
      </div>
      {plan.monthlyEquivalentJpy !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          月換算 {formatJpy(plan.monthlyEquivalentJpy)}
        </p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.note}</p>

      <Button asChild size="lg" className="mt-5 h-12 w-full text-base">
        <Link href={checkoutHref}>
          このプランに進む
          <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}
