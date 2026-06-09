'use client';

// 問題への通報ボタン(演習画面で解説 expand 後に表示)
import { useState } from 'react';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  questionId: string;
  className?: string;
};

const CATEGORIES = [
  { v: 'wrong_answer', label: '答えが違う/おかしい' },
  { v: 'unclear_text', label: '問題文がわかりづらい' },
  { v: 'bad_choice', label: '選択肢に問題がある' },
  { v: 'bad_explanation', label: '解説に問題がある' },
  { v: 'other', label: 'その他' },
] as const;
type Cat = (typeof CATEGORIES)[number]['v'];

export function ReportButton({ questionId, className }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Cat>('wrong_answer');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function close() {
    setOpen(false);
    // モーダル閉じてから少し待ってリセット(再オープン時のチラつき防止)
    setTimeout(() => {
      setCategory('wrong_answer');
      setComment('');
      setSubmitting(false);
      setDone(false);
      setErrorMsg('');
    }, 200);
  }

  async function submit() {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/question-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          category,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setDone(true);
      setTimeout(close, 2000);
    } catch (e) {
      setErrorMsg((e as Error).message || '送信に失敗しました');
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
          'inline-flex items-center gap-1.5 text-[11px] text-jigen-ink-mute underline-offset-4 hover:text-jigen-warning hover:underline',
          className,
        )}
      >
        <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
        この問題を通報
      </button>

      {open ? (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-jigen-gold/40 bg-jigen-bg-panel p-5 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-jigen-ink">
                <AlertTriangle aria-hidden className="h-5 w-5 text-jigen-warning" />
                問題を通報
              </h2>
              <button
                type="button"
                aria-label="閉じる"
                onClick={close}
                className="rounded-md p-1 text-jigen-ink-mute hover:bg-jigen-bg-panel-2 hover:text-jigen-ink"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <Check aria-hidden className="mx-auto h-10 w-10 text-emerald-400" />
                <p className="mt-3 text-sm font-semibold text-jigen-ink">通報を受け付けました</p>
                <p className="mt-1 text-xs text-jigen-ink-soft">確認してリストから除外します。 ご協力ありがとうございます。</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-jigen-ink-soft">
                  品質改善のためご協力ください。 詳細は support@jigen-app.com に届きます。
                </p>

                {/* カテゴリ */}
                <div className="mb-3">
                  <p className="mb-2 text-xs font-bold text-jigen-gold">通報カテゴリ</p>
                  <div className="space-y-1">
                    {CATEGORIES.map((c) => (
                      <label
                        key={c.v}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm',
                          category === c.v
                            ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                            : 'border-jigen-border-soft bg-jigen-bg-dark text-jigen-ink hover:border-jigen-gold/40',
                        )}
                      >
                        <input
                          type="radio"
                          name="report-cat"
                          value={c.v}
                          checked={category === c.v}
                          onChange={() => setCategory(c.v)}
                          className="accent-jigen-gold"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* コメント */}
                <div className="mb-3">
                  <label className="mb-2 block text-xs font-bold text-jigen-gold">詳細(任意・2000文字まで)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                    rows={3}
                    placeholder="どのあたりに問題があるかを書いていただけると助かります"
                    className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink focus:border-jigen-gold focus:outline-none"
                  />
                </div>

                {errorMsg ? <p className="mb-3 text-xs text-jigen-warning">{errorMsg}</p> : null}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-xl border border-jigen-border-soft bg-jigen-bg-dark px-4 py-2 text-sm font-semibold text-jigen-ink hover:bg-jigen-bg-panel-2"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-gold-gradient px-4 py-2 text-sm font-bold text-jigen-bg-dark shadow-gold-glow disabled:opacity-50"
                  >
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />送信中</> : '通報する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
