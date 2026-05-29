import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

// プライバシーポリシー。ノモ作成 legal/privacy_policy.md を public/legal/ 経由で読み込む。

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'ジゲン(株式会社ティラノ資格学校)のプライバシーポリシー。',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="プライバシーポリシー"
      slug="privacy_policy"
      fallbackNote="(準備中 — 法務確認後に掲載)"
    />
  );
}
