'use client';

// 旧:解説画面下部の [理解した] [後で復習] CTA。
// 2026-05-31 ナギ:演習runner側に統合済み。互換性のため最小実装だけ残す。
// (まだ参照している箇所があれば、見つけ次第 PracticeRunner 側に寄せる)
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ExplanationActions(_props: { questionId: string }) {
  const router = useRouter();

  function goNext() {
    router.push('/practice/random');
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        variant="outline"
        className="flex-1 border-jigen-border-soft text-jigen-ink hover:border-jigen-gold/60 hover:bg-jigen-bg-panel-2"
        onClick={goNext}
      >
        後で復習
      </Button>
      <Button
        className="flex-1 bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
        onClick={goNext}
      >
        次の問題へ
      </Button>
    </div>
  );
}
