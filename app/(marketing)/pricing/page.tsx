import Link from 'next/link';

// S02 価格ページ雛形
// TODO(ハナ): 価格訴求コピー / 比較表
export default function PricingPage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold">料金</h1>
      <p className="mt-4 text-muted-foreground">
        7日間は無料。クレジットカード登録は不要です。
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">月額</h2>
          <p className="mt-2 text-3xl font-bold">¥2,980<span className="text-sm font-normal">/月</span></p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>全機能</li>
            <li>AI解説 無制限</li>
            <li>いつでも解約</li>
          </ul>
          <Link href="/auth/signup" className="mt-6 block rounded-md bg-primary px-4 py-3 text-center text-primary-foreground">
            7日間ためす
          </Link>
        </article>

        <article className="rounded-lg border-2 border-primary p-6">
          <h2 className="text-xl font-semibold">年額</h2>
          <p className="mt-2 text-3xl font-bold">¥24,800<span className="text-sm font-normal">/年</span></p>
          <p className="text-xs text-muted-foreground">2か月ぶんお得</p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>全機能</li>
            <li>AI解説 無制限</li>
            <li>試験日まで腰を据えて</li>
          </ul>
          <Link href="/auth/signup" className="mt-6 block rounded-md bg-primary px-4 py-3 text-center text-primary-foreground">
            7日間ためす
          </Link>
        </article>
      </div>
    </main>
  );
}
