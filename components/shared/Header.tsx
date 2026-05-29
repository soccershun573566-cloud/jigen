import Link from 'next/link';

// 共通ヘッダ placeholder(認証必須ルートでは下部タブが主、上部ヘッダは最小)
export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/home" className="font-bold">
          ジゲン
        </Link>
        {/* TODO(ナギ): 残ストリーク・通知バッジ */}
      </div>
    </header>
  );
}
