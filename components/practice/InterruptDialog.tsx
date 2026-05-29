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

// 中断モーダル: ユウ§2-(2)「中断ボタン常時表示・進捗自動保存」
export function InterruptDialog() {
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
