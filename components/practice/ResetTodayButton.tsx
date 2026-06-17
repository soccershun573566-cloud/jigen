'use client';

import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { resetSession } from '@/components/practice/PracticeRunner';

/**
 * 「今日の進捗をリセット」 ボタン。
 *
 * リセットは表示カウンタのみ:
 *   - 解いた問題の記録(attempts)・間違いリスト・分析データは 絶対に 削除されません
 *   - サーバ側で users.daily_reset_at = now() を立てるだけ
 *   - リセット後、 親側で todaySolved を 0 にする
 */
export function ResetTodayButton({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function performReset() {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/practice/reset-today', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      // 経過時間ストップウォッチも 0:00 に戻す
      resetSession();
      // 中断時の引き継ぎ snapshot もクリア
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('jigen_today_solved_snapshot_v1'); } catch {}
      }
      onReset();
      setOpen(false);
    } catch (e) {
      setErrorMsg((e as Error).message || 'リセットに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="今日の進捗をリセット"
          className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          リセット
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>今日の進捗をリセットしますか</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">今日解いた問題数の表示だけが 0 に戻ります。</span>
            <span className="block text-jigen-gold">
              ✅ 間違いリスト / 分析データ / 学習履歴 は 一切 削除されません。
            </span>
            <span className="block text-xs text-jigen-ink-mute">
              リセット後の演習から、 改めて今日の問題数がカウントされます。
            </span>
          </DialogDescription>
        </DialogHeader>
        {errorMsg ? <p className="text-sm text-red-500">{errorMsg}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={performReset} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" />リセット中</>
            ) : (
              'リセットする'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
