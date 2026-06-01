'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, RotateCcw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { cn } from '@/lib/utils';

type Props = {
  currentAvatarUrl: string | null;
};

export function AvatarEditor({ currentAvatarUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function openDialog() {
    setOpen(true);
    setPreviewUrl(null);
    setPickedFile(null);
    setErrorMessage('');
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErrorMessage('5MB以下のファイルを選んでください');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(f.type)) {
      setErrorMessage('PNG / JPG / WEBP / GIF を選んでください');
      return;
    }
    setErrorMessage('');
    setPickedFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function upload() {
    if (!pickedFile) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const fd = new FormData();
      fd.append('file', pickedFile);
      const res = await fetch('/api/me/avatar', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErrorMessage((e as Error).message || 'アップロードに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function resetToDefault() {
    if (!confirm('デフォルトのティラノ先生アイコンに戻しますか?')) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/me/avatar', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErrorMessage((e as Error).message || 'リセットに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  const hasCustom = !!currentAvatarUrl;

  return (
    <>
      {/* 円形アバター + 右下のカメラボタン(クリックで Dialog) */}
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          'group relative inline-block h-32 w-32 overflow-hidden rounded-full border-2 border-jigen-gold/40 shadow-gold-glow',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark',
        )}
        aria-label="アイコンを変更"
      >
        {hasCustom ? (
          <Image
            src={currentAvatarUrl}
            alt="アバター"
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : (
          <TiranoSensei size="xl" glow rounded />
        )}
        <span className="absolute bottom-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-jigen-bg-dark shadow-gold-glow transition-transform group-hover:scale-110">
          <Camera aria-hidden className="h-4 w-4" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
        <DialogContent className="border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink">
          <DialogHeader>
            <DialogTitle className="text-jigen-ink">アイコンを変更</DialogTitle>
            <DialogDescription className="text-jigen-ink-soft">
              5MB以下のPNG/JPG/WEBP/GIFを選んでアップロードできます。
            </DialogDescription>
          </DialogHeader>

          {/* プレビュー */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-jigen-gold/40 shadow-gold-glow">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="プレビュー"
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : hasCustom ? (
                <Image
                  src={currentAvatarUrl}
                  alt="現在のアバター"
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : (
                <TiranoSensei size="xl" glow rounded />
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onPick}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
              className="!bg-transparent border border-jigen-border-soft text-jigen-ink hover:border-jigen-gold/60 hover:!bg-jigen-bg-panel-2/40 hover:text-jigen-ink"
            >
              ファイルを選択
            </Button>

            {hasCustom ? (
              <button
                type="button"
                onClick={resetToDefault}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
              >
                <RotateCcw aria-hidden className="h-3 w-3" />
                デフォルト(ティラノ先生)に戻す
              </button>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="text-xs text-jigen-warning">{errorMessage}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="!bg-transparent border border-jigen-border-soft text-jigen-ink hover:border-jigen-gold/60 hover:!bg-jigen-bg-panel-2/40 hover:text-jigen-ink"
            >
              <X className="mr-1 h-4 w-4" />
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={upload}
              disabled={submitting || !pickedFile}
              className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 aria-hidden className="mr-1 h-4 w-4 animate-spin" />
                  アップロード中...
                </>
              ) : (
                'アップロード'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
