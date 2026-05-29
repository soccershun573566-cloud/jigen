import Link from 'next/link';
import { Button } from '@/components/ui/button';

// ファイナルCTA(ハナ§8)
// 太字許可: 「7日間」「クレジットカードは要りません」
export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="border-b bg-primary text-primary-foreground"
    >
      <div className="container mx-auto px-4 py-20 text-center md:py-28">
        <h2
          id="final-cta-title"
          className="text-3xl font-bold leading-tight tracking-tight md:text-5xl"
        >
          まず、<strong className="font-bold">7日間</strong>を試してみる。
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">
          <strong className="font-bold">クレジットカードは要りません。</strong>
          続けるかどうかは、7日後に決めてください。
        </p>

        <div className="mt-10 flex justify-center">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="min-h-12 px-10 text-base"
          >
            <Link href="/auth/signup">無料で始める</Link>
          </Button>
        </div>

        <ul className="mx-auto mt-8 max-w-md space-y-1.5 text-left text-sm text-primary-foreground/80 md:text-base">
          <li>・クレジットカード登録 不要</li>
          <li>・自動課金 なし(8日目に無料プラン自動移行)</li>
          <li>・解約はいつでも・引き留めなし</li>
        </ul>
      </div>
    </section>
  );
}
