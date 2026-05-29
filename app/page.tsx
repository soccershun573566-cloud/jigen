import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ジゲン | 1級建築施工管理技士の学習アプリ',
  description:
    '1級建築施工管理技士の独学者向け、AIが毎日の学習を個別設計するサブスク型アプリ。月¥2,980・7日無料・クレカ登録不要。',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-4xl font-bold tracking-tight">独学に、AIが伴走します。</h1>
        <p className="mb-10 text-lg leading-relaxed text-slate-700">
          1級建築施工管理技士の独学を支える月額サブスク。
          資格学校に15万円は出せない。でも独学は何から始めるか分からない。
          その中間を埋めます。
        </p>

        <div className="mb-10 rounded-lg border border-slate-200 p-6">
          <div className="mb-2 text-3xl font-bold">月 ¥2,980</div>
          <div className="mb-4 text-sm text-slate-600">年 ¥24,800(月換算 ¥2,067)</div>
          <div className="text-sm text-slate-700">
            7日間無料 / クレジットカードの登録は必要ありません
          </div>
        </div>

        <a
          href="/auth/signup"
          className="inline-flex h-12 items-center justify-center rounded-md bg-slate-900 px-8 text-base font-semibold text-white hover:bg-slate-800"
        >
          7日無料で始める
        </a>

        <div className="mt-16 text-sm text-slate-500">
          <p>運営: 山口竣輔(屋号: ティラノ資格学校)</p>
          <p className="mt-2">
            <a href="/legal/tokushoho" className="underline">
              特定商取引法に基づく表記
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
