'use client';

import { useCompletion } from 'ai/react';

// AI 解説(誤答時に開く)
// 技術構築計画§5.1
// TODO(ナギ): ローディング状態、エラー、フィードバックボタン(R-02 対策)

export function AIExplanation(_props: { questionId: string; userAnswer: unknown }) {
  const { completion, isLoading, error } = useCompletion({
    api: '/api/ai/explain',
  });

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold">解説</h3>
      {isLoading && <p className="mt-2 text-sm text-muted-foreground">読み込み中...</p>}
      {error && <p className="mt-2 text-sm text-destructive">解説を表示できません</p>}
      {completion && <p className="mt-2 whitespace-pre-wrap text-sm">{completion}</p>}
      {/* TODO: 「この解説は違う」フィードバックボタン */}
    </div>
  );
}
