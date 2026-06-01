'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  initialName: string;
  fallback: string;
};

export function NicknameEditor({ initialName, fallback }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function save() {
    setSaving(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/me/nickname', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setName(value);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErrorMessage((e as Error).message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">ニックネーム</p>
        <button
          type="button"
          onClick={() => {
            setValue(name || '');
            setEditing(true);
          }}
          className={cn(
            'group mt-1 inline-flex items-center gap-2 rounded-md text-2xl font-bold text-jigen-ink',
            'hover:text-jigen-gold',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-jigen-gold focus-visible:ring-offset-2 focus-visible:ring-offset-jigen-bg-dark',
          )}
        >
          <span>{name || fallback}</span>
          <Pencil aria-hidden className="h-4 w-4 text-jigen-ink-mute group-hover:text-jigen-gold" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-jigen-ink-mute">ニックネーム</p>
      <div className="mt-1 flex items-center gap-2">
        <input
          autoFocus
          type="text"
          maxLength={30}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className="w-44 rounded-md border border-jigen-gold/40 bg-jigen-bg-panel-2 px-3 py-1.5 text-lg font-bold text-jigen-ink outline-none focus:border-jigen-gold focus:ring-2 focus:ring-jigen-gold/40"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || value.trim().length === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold-gradient text-jigen-bg-dark disabled:opacity-50"
          aria-label="保存"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setErrorMessage('');
          }}
          disabled={saving}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-jigen-border-soft text-jigen-ink-mute hover:text-jigen-ink"
          aria-label="キャンセル"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {errorMessage ? (
        <p className="mt-1 text-xs text-jigen-warning">{errorMessage}</p>
      ) : null}
    </div>
  );
}
