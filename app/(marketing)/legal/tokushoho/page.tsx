import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

// 特商法表記。ノモ作成 legal/tokushoho.md を public/legal/ 経由で読み込む。
// MVP: 同梱しビルド時に取り込む(将来 CMS 化検討)。

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
  description: 'ジゲン(株式会社ティラノ資格学校)の特定商取引法に基づく表記。',
  alternates: { canonical: '/legal/tokushoho' },
};

export default function TokushohoPage() {
  return (
    <LegalPage
      title="特定商取引法に基づく表記"
      slug="tokushoho"
      fallbackNote="(準備中 — ノモから受領後にビルドへ取り込む)"
    />
  );
}
