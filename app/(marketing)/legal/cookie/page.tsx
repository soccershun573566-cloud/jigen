import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

// Cookieポリシー。ノモ作成 legal/cookie_policy.md を public/legal/ 経由で読み込む。

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Cookieポリシー',
  description: 'ジゲン(株式会社ティラノ資格学校)のCookieポリシー。',
  alternates: { canonical: '/legal/cookie' },
};

export default function CookiePage() {
  return (
    <LegalPage
      title="Cookieポリシー"
      slug="cookie_policy"
      fallbackNote="(準備中 — 法務確認後に掲載)"
    />
  );
}
