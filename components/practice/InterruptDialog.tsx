'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pause } from 'lucide-react';
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
import { pauseSession } from '@/components/practice/PracticeRunner';

// 中断モーダル: ユウ§2-(2)「中断ボタン常時表示・進捗自動保存」
//   - 中断時に経過時間ストップウォッチも止める(pauseSession)
//   - 中断前の todaySolved は localStorage に保存され、 再開時に復元
export function InterruptDialog({ todaySolved }: { todaySolved?: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="中断する"
          className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Pause aria-hidden className="h-4 w-4" />
          中断
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ここで止めますか</DialogTitle>
          <DialogDescription>
            進捗は保存されます。続きから再開できます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            続ける
          </Button>
          <Button
            onClick={() => {
              // 経過時間ストップウォッチを停止
              pauseSession();
              // 中断時点の todaySolved を保存(再開時に引き継ぐ)
              if (typeof todaySolved === 'number' && typeof window !== 'undefined') {
                try {
                  localStorage.setItem('jigen_today_solved_snapshot_v1', String(todaySolved));
                } catch { /* QuotaExceededError等は無視 */ }
              }
              setOpen(false);
              router.push('/home');
            }}
          >
            中断する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
