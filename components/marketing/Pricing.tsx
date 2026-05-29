import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// フィフスビュー(ハナ§6)料金
// 太字許可箇所: 「¥2,980」「¥24,800」「クレジットカードの登録は必要ありません」
export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-b bg-background"
    >
      <div className="container mx-auto px-4 py-20 md:py-24">
        <h2
          id="pricing-title"
          className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
        >
          料金プラン
        </h2>

        <div className="mt-10 rounded-lg border bg-secondary/40 p-6 md:p-8">
          <p className="text-base leading-relaxed text-foreground md:text-lg">
            どちらのプランも、7日間は無料で全機能を試せます。
            <br />
            <strong className="font-bold">クレジットカードの登録は必要ありません。</strong>
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col p-8">
              <h3 className="text-xl font-semibold text-foreground">月額プラン</h3>
              <p className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                <strong>¥2,980</strong>
                <span className="ml-2 text-base font-normal text-muted-foreground">/ 月(税込)</span>
              </p>
              <p className="mt-3 text-base text-foreground/90">いつでも解約できます。</p>
              <div className="mt-auto pt-8">
                <Button asChild size="lg" className="w-full min-h-12 text-base">
                  <Link href="/auth/signup">7日無料で始める</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="flex h-full flex-col p-8">
              <h3 className="text-xl font-semibold text-foreground">年額プラン</h3>
              <p className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                <strong>¥24,800</strong>
                <span className="ml-2 text-base font-normal text-muted-foreground">/ 年(税込)</span>
              </p>
              <p className="mt-3 text-base text-foreground/90">月換算 ¥2,067。</p>
              <div className="mt-auto pt-8">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full min-h-12 text-base"
                >
                  <Link href="/auth/signup">7日無料で始める</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          8日目に自動で無料プランへ切り替わります。課金は、内容を確かめたうえで決めてください。
        </p>
      </div>
    </section>
  );
}
