'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = ['建築学一般', '施工管理法', '法規', 'その他'];
const TARGET_OPTIONS = [
  { v: 10, label: '10問', desc: 'スキマ時間で軽く' },
  { v: 25, label: '25問', desc: '標準ペース' },
  { v: 50, label: '50問', desc: 'がっつり詰める' },
  { v: 100, label: '100問', desc: '直前駆け込み層' },
];

type Props = {
  initialExamDate: string | null;
  initialDailyTarget: number;
  initialWeekdayMinutes: number;
  initialWeekendMinutes: number;
  initialStrongSections: string[];
  initialWeakSection: string;
};

export function LearningSettings(p: Props) {
  const router = useRouter();
  const [examDate, setExamDate] = useState(p.initialExamDate?.slice(0, 10) ?? '');
  const [dailyTarget, setDailyTarget] = useState(p.initialDailyTarget);
  const [weekdayMin, setWeekdayMin] = useState(p.initialWeekdayMinutes);
  const [weekendMin, setWeekendMin] = useState(p.initialWeekendMinutes);
  const [strongs, setStrongs] = useState<string[]>(p.initialStrongSections);
  const [weak, setWeak] = useState(p.initialWeakSection);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function save() {
    setSaving(true);
    setSaved(false);
    setErrorMsg('');
    try {
      const res = await fetch('/api/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetExamDate: examDate || null,
          dailyTargetQuestions: dailyTarget,
          weekdayMinutes: weekdayMin,
          weekendMinutes: weekendMin,
          strongSections: strongs,
          weakSection: weak,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErrorMsg((e as Error).message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5">
      {/* 試験日 */}
      <div>
        <label className="mb-2 block text-xs font-bold text-jigen-gold inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />試験日(自由変更可能)
        </label>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          min="2026-01-01"
          max="2030-12-31"
          className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-white font-medium focus:border-jigen-gold focus:outline-none [color-scheme:dark]"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-jigen-ink-mute">候補:</span>
          <button
            type="button"
            onClick={() => setExamDate('2026-07-19')}
            className="rounded-md border border-jigen-gold/40 bg-jigen-gold/10 px-2 py-1 font-bold text-jigen-gold hover:bg-jigen-gold/20"
          >
            2026/07/19(1次)
          </button>
          <button
            type="button"
            onClick={() => setExamDate('2026-10-18')}
            className="rounded-md border border-jigen-gold/40 bg-jigen-gold/10 px-2 py-1 font-bold text-jigen-gold hover:bg-jigen-gold/20"
          >
            2026/10/18(2次)
          </button>
          {examDate ? (
            <button
              type="button"
              onClick={() => setExamDate('')}
              className="rounded-md border border-jigen-border-soft px-2 py-1 text-jigen-ink-mute hover:text-jigen-warning"
            >
              クリア
            </button>
          ) : null}
        </div>
      </div>

      {/* 1日の目標問題数 */}
      <div>
        <label className="mb-2 block text-xs font-bold text-jigen-gold">1日の目標問題数</label>
        <div className="grid grid-cols-2 gap-2">
          {TARGET_OPTIONS.map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setDailyTarget(opt.v)}
              className={cn(
                'rounded-lg border p-2.5 text-left text-xs transition-colors',
                dailyTarget === opt.v
                  ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                  : 'border-jigen-border-soft bg-jigen-bg-dark text-jigen-ink hover:border-jigen-gold/40',
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{opt.label}</span>
                <span className="text-[10px] font-medium text-jigen-ink">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 平日・週末 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-xs font-bold text-jigen-gold">平日(分/日)</label>
          <input
            type="number"
            min={5} max={240}
            value={weekdayMin}
            onChange={(e) => setWeekdayMin(parseInt(e.target.value, 10) || 30)}
            className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink focus:border-jigen-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-jigen-gold">週末(分/日)</label>
          <input
            type="number"
            min={5} max={480}
            value={weekendMin}
            onChange={(e) => setWeekendMin(parseInt(e.target.value, 10) || 60)}
            className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink focus:border-jigen-gold focus:outline-none"
          />
        </div>
      </div>

      {/* 強い教科 */}
      <div>
        <label className="mb-2 block text-xs font-bold text-jigen-gold">自信のある教科(複数選択可)</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(sec => {
            const picked = strongs.includes(sec);
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setStrongs(picked ? strongs.filter(s => s !== sec) : [...strongs, sec])}
                className={cn(
                  'rounded-lg border p-2 text-xs',
                  picked
                    ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                    : 'border-jigen-border-soft bg-jigen-bg-dark text-jigen-ink hover:border-jigen-gold/40',
                )}
              >
                {picked ? '✓ ' : ''}{sec}
              </button>
            );
          })}
        </div>
      </div>

      {/* 苦手教科 */}
      <div>
        <label className="mb-2 block text-xs font-bold text-jigen-gold">一番苦手な教科</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(sec => (
            <button
              key={sec}
              type="button"
              onClick={() => setWeak(sec)}
              className={cn(
                'rounded-lg border p-2 text-xs',
                weak === sec
                  ? 'border-jigen-warning bg-jigen-warning-soft/30 text-jigen-warning'
                  : 'border-jigen-border-soft bg-jigen-bg-dark text-jigen-ink hover:border-jigen-warning/40',
              )}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {errorMsg ? <p className="text-xs text-jigen-warning">{errorMsg}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-gold-gradient text-sm font-bold text-jigen-bg-dark shadow-gold-glow disabled:opacity-50"
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" />保存中...</>
         : saved ? <><Check className="h-4 w-4" />保存しました</>
         : '学習設定を保存'}
      </button>
    </div>
  );
}
