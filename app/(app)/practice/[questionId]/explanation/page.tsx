// S07 解説画面(2026-05-31 ナギ刷新)
// 解説は同一画面 expand に統合済み。この独立画面は外部ブックマーク等の互換用。
// ダーク+ゴールド基調に統一し、本問題画面への戻り導線のみ提供する。
import Link from 'next/link';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

interface Props {
  params: { questionId: string };
}

export const dynamic = 'force-dynamic';

export default function ExplanationPage({ params }: Props) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-jigen-ink">
      <TiranoSensei size="md" label="ティラノ先生" />

      <div className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
          Explanation
        </p>
        <h1 className="text-lg font-semibold">解説は問題画面でひらきます</h1>
        <p className="text-xs text-jigen-ink-mute">
          解答後に「解説を見る」をひらいてください
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Link
          href={`/practice/${params.questionId}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-jigen-border-soft bg-jigen-bg-panel px-4 text-sm font-semibold text-jigen-ink hover:border-jigen-gold/50 hover:bg-jigen-bg-panel-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          この問題に戻る
        </Link>
        <Link
          href="/practice/random"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gold-gradient px-4 text-sm font-semibold text-jigen-bg-dark hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold-bright focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark"
        >
          <Shuffle aria-hidden className="h-4 w-4" />
          次の問題へ
        </Link>
      </div>
    </div>
  );
}
