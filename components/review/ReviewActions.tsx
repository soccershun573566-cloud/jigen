'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

// S08 末尾: [閉じる] [もう少しやる]
// 「もう少しやる」は復習問題のみ提示の予告文言(ユウ§2-(2))
export function ReviewActions({ nextReviewQuestionId }: { nextReviewQuestionId: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild variant="outline" className="flex-1">
        <Link href="/home">閉じる</Link>
      </Button>
      <Button asChild className="flex-1">
        <Link
          href={`/practice/${nextReviewQuestionId}`}
          aria-label="復習問題だけをもう少しやる"
        >
          もう少しやる
          <span className="ml-2 text-xs font-normal opacity-80">(復習のみ)</span>
        </Link>
      </Button>
    </div>
  );
}
