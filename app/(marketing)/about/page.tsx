import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// 会社情報(最小)
// 屋号: ティラノ資格学校 / 個人事業主前提(ノモ法務確認中)

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '会社情報',
  description: 'ジゲンの運営事業者情報、ミッション、運営者についてのご案内。',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main id="main" className="min-h-screen bg-background">
      <article className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <nav aria-label="戻る" className="mb-8 text-sm">
          <Link
            href="/lp"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← トップへ戻る
          </Link>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          会社情報
        </h1>

        <section aria-labelledby="mission" className="mt-10">
          <h2 id="mission" className="text-xl font-semibold text-foreground">
            ジゲンのミッション
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">
            資格学校に15万円は出せない、でも独学は何から始めるか分からない。
            その中間を、AIが埋める。
            1級建築施工管理技士を目指す現場の独学者が、
            毎日3分でも続けられる学習環境を提供します。
          </p>
        </section>

        <section aria-labelledby="overview" className="mt-12">
          <h2 id="overview" className="text-xl font-semibold text-foreground">
            事業概要
          </h2>
          <dl className="mt-4 divide-y divide-border border-t border-b border-border text-sm">
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-medium text-muted-foreground">サービス名</dt>
              <dd className="text-foreground">ジゲン</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-medium text-muted-foreground">事業内容</dt>
              <dd className="text-foreground">
                1級建築施工管理技士試験対策のオンライン学習サービスの開発・運営
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-medium text-muted-foreground">屋号</dt>
              <dd className="text-foreground">ティラノ資格学校</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-medium text-muted-foreground">運営形態</dt>
              <dd className="text-foreground">個人事業主</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-medium text-muted-foreground">設立</dt>
              <dd className="text-foreground">2026年</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            ※ 詳細な事業者情報(運営統括責任者・所在地・連絡先等)は{' '}
            <Link
              href="/legal/tokushoho"
              className="underline underline-offset-4 hover:text-foreground"
            >
              特定商取引法に基づく表記
            </Link>
            {' '}に記載しています。
          </p>
        </section>

        <section aria-labelledby="contact" className="mt-12">
          <h2 id="contact" className="text-xl font-semibold text-foreground">
            お問い合わせ
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">
            サービスに関するご質問・ご要望は{' '}
            <Link
              href="/contact"
              className="underline underline-offset-4 hover:text-foreground"
            >
              お問い合わせ
            </Link>
            {' '}よりお寄せください。
          </p>
        </section>
      </article>
      <MarketingFooter />
    </main>
  );
}
