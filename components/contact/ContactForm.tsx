'use client';

import { useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { v: 'question', label: 'ご質問' },
  { v: 'bug', label: '不具合の報告' },
  { v: 'request', label: '機能のご要望' },
  { v: 'billing', label: '課金・解約について' },
  { v: 'other', label: 'その他' },
] as const;
type Cat = (typeof CATEGORIES)[number]['v'];

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Cat>('question');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          category,
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (e) {
      setErrorMsg((e as Error).message || '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <Check aria-hidden className="mx-auto h-12 w-12 text-emerald-400" />
        <p className="mt-3 text-base font-bold text-foreground">送信完了しました</p>
        <p className="mt-1 text-sm text-foreground/70">
          通常2営業日以内に <b>{email}</b> 宛にご返信します。
        </p>
        <p className="mt-1 text-xs text-foreground/50">(土日祝・年末年始を除く)</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      aria-label="お問い合わせフォーム"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-name" className="mb-1.5 block text-xs font-bold text-foreground/80">
            お名前(任意)
          </label>
          <input
            id="ct-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="山口 竣輔"
          />
        </div>
        <div>
          <label htmlFor="ct-email" className="mb-1.5 block text-xs font-bold text-foreground/80">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            id="ct-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold text-foreground/80">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <label
              key={c.v}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                category === c.v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background hover:border-primary/40',
              )}
            >
              <input
                type="radio"
                name="ct-cat"
                value={c.v}
                checked={category === c.v}
                onChange={() => setCategory(c.v)}
                className="accent-primary"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="ct-msg" className="mb-1.5 block text-xs font-bold text-foreground/80">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="ct-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 5000))}
          required
          minLength={5}
          rows={6}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="お問い合わせ内容をご記入ください..."
        />
        <p className="mt-1 text-right text-[10px] text-foreground/50">{message.length}/5000</p>
      </div>

      {errorMsg ? <p className="text-sm text-red-500">{errorMsg}</p> : null}

      <button
        type="submit"
        disabled={submitting || message.trim().length < 5}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" />送信中...</>
        ) : (
          <><Send className="h-4 w-4" />送信する</>
        )}
      </button>

      <p className="text-center text-[11px] text-foreground/50">
        ご記入いただいた個人情報は <a href="/legal/privacy" className="underline">プライバシーポリシー</a> に基づき、 ご返信目的のみに使用します。
      </p>
    </form>
  );
}
