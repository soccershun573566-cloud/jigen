'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getNextQuestionId } from '@/lib/mock/dashboard-data';

// 解説画面下部の [理解した] [後で復習] CTA。
// モックなので localStorage 等への永続化は行わず、ボタン押下のフィードバックのみ表示する。
export function ExplanationActions({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [marked, setMarked] = useState<'understood' | 'later' | null>(null);

  function goNext() {
    const nextId = getNextQuestionId(questionId);
    router.push(nextId ? `/practice/${nextId}` : '/review');
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => {
          setMarked('later');
          goNext();
        }}
      >
        後で復習
      </Button>
      <Button
        className="flex-1"
        onClick={() => {
          setMarked('understood');
          goNext();
        }}
      >
        理解した
      </Button>
      {marked && <span className="sr-only">記録しました</span>}
    </div>
  );
}
