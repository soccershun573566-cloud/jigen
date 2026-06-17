'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clearAllPracticeClientState } from '@/lib/practice/reset-sync';

/**
 * 「今日の進捗をリセット」ボタン。
 * 誤タップ防止のため2段階確認(モーダル)を挟む。
 * - 1段階目: ボタンタップ → モーダル表示
 * - 2段階目: モーダル内「リセットする」確定 → 削除API → router.refresh()
 */
export function ResetTodayButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  async function confirmReset() {
    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/me/reset-today', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      // 演習画面と同期するため、 ローカルの進捗キャッシュを一掃
      clearAllPracticeClientState();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErrorMessage((e as Error).message || 'リセットに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-jigen-border-soft px-2.5 py-1.5 text-[11px] text-jigen-ink-mute transition-colors',
          'hover:border-jigen-gold/40 hover:text-jigen-ink',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark',
        )}
        aria-label="今日の進捗をリセット"
      >
        <RotateCcw aria-hidden className="h-3.5 w-3.5" />
        リセット
      </button>

      <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
        <DialogContent className="border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink">
          <DialogHeader>
            <DialogTitle className="text-jigen-ink">今日の進捗をリセットしますか?</DialogTitle>
            <DialogDescription className="text-jigen-ink-soft space-y-2">
              <span className="block">今日解いた問題数の表示だけが 0 に戻ります。</span>
              <span className="block text-jigen-gold">
                ✅ 間違いリスト / 分析データ / 学習履歴 は 一切 削除されません。
              </span>
              <span className="block text-xs text-jigen-ink-mute">
                リセット後の演習から、 改めて今日の問題数がカウントされます。
              </span>
            </DialogDescription>
          </DialogHeader>

          {errorMessage ? (
            <p className="text-xs text-jigen-warning">{errorMessage}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="border-jigen-border-soft bg-transparent text-jigen-ink hover:border-jigen-gold/60 hover:bg-jigen-bg-panel-2 hover:text-jigen-ink"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={confirmReset}
              disabled={submitting}
              className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
            >
              {submitting ? (
                <>
                  <Loader2 aria-hidden className="mr-1 h-4 w-4 animate-spin" />
                  リセット中...
                </>
              ) : (
                'リセットする'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
