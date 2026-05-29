import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { ProblemStatement } from '@/components/marketing/ProblemStatement';
import { CompetitorComparison } from '@/components/marketing/CompetitorComparison';
import { Features } from '@/components/marketing/Features';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// S01 LP(ハナのコピー v1.0 を実装)
// セクション順序はハナ§11.4 に準拠

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jigen.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '1級建築施工管理技士の学習アプリ ジゲン | 月¥2,980・7日無料',
  description:
    '1級建築施工管理技士の独学を支える月額サブスク型学習アプリ。AIが毎日の学習を個別に設計します。月¥2,980・年¥24,800。7日間無料・クレジットカード登録は不要です。',
  alternates: { canonical: '/lp' },
  keywords: ['1級建築施工管理技士', '学習アプリ', '独学', 'AI学習', '月額サブスク'],
  openGraph: {
    title: 'ジゲン - 1級建築施工管理技士の学習アプリ',
    description:
      '資格学校に15万円は出せない、でも独学は何から始めるか分からない。その中間を、AIが埋めます。月¥2,980。クレカ登録不要の7日無料。',
    url: '/lp',
    siteName: 'ジゲン',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        // TODO(ハナ→ユウ): 1200×630 のOGP画像を /public/og-image.png に配置
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ジゲン - 1級建築施工管理技士の学習アプリ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ジゲン - 1級建築施工管理技士の学習アプリ',
    description:
      '資格学校に15万円は出せない、でも独学は何から始めるか分からない。その中間を、AIが埋めます。月¥2,980。クレカ登録不要の7日無料。',
    images: ['/og-image.png'],
  },
};

export default function MarketingLandingPage() {
  return (
    <main id="main" className="min-h-screen bg-background">
      <Hero />
      <ProblemStatement />
      <CompetitorComparison />
      <Features />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}
