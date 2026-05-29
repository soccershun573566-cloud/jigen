import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

// 利用規約。ノモ作成 legal/terms_of_service.md を public/legal/ 経由で読み込む。

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '利用規約',
  description: 'ジゲン(株式会社ティラノ資格学校)の利用規約。',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="利用規約"
      slug="terms_of_service"
      fallbackNote="(準備中 — 法務確認後に掲載)"
    />
  );
}
