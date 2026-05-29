import Link from 'next/link';
import { Button } from '@/components/ui/button';

// ファーストビュー(ハナ§2)
// メインキャッチ・サブキャッチ・主CTA・副CTA・マイクロコピー
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="border-b bg-background"
    >
      <div className="container mx-auto px-4 pb-20 pt-16 md:pb-28 md:pt-24">
        <p className="text-base text-muted-foreground md:text-lg">
          資格学校15万円が出せなくても、合格は諦めない。
        </p>
        <h1
          id="hero-title"
          className="mt-4 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
        >
          <strong className="font-bold">独学に、AIが伴走します。</strong>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/90 md:text-xl">
          1級建築施工管理技士。<strong className="font-bold">月¥2,980</strong>
          で、毎日の学習をAIが設計します。
        </p>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button asChild size="lg" className="min-h-12 px-8 text-base">
            <Link href="/auth/signup">7日無料で始める</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-12 px-8 text-base">
            <a href="#features">中身を見る</a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          クレジットカードの登録は不要です
        </p>
      </div>
    </section>
  );
}
