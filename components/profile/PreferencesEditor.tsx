'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Settings2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SECTIONS = ['建築学一般', '施工管理法', '法規', 'その他'];
const TARGET_OPTIONS = [
  { v: 10, label: '10問', desc: 'スキマ時間で軽く' },
  { v: 25, label: '25問', desc: '標準ペース' },
  { v: 50, label: '50問', desc: 'がっつり詰める' },
  { v: 100, label: '100問', desc: '直前駆け込み層' },
];

type Prefs = {
  target_exam_date: string | null;
  daily_target_questions: number;
  weekday_minutes: number;
  weekend_minutes: number;
  notification_morning_at: string | null;
  notification_enabled: boolean;
  strong_sections: string[] | null;
  weak_section: string | null;
};

export function PreferencesEditor() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  // 状態
  const [examDate, setExamDate] = useState('');
  const [dailyTarget, setDailyTarget] = useState(25);
  const [weekdayMin, setWeekdayMin] = useState(30);
  const [weekendMin, setWeekendMin] = useState(60);
  const [strongs, setStrongs] = useState<string[]>([]);
  const [weak, setWeak] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/me/preferences', { credentials: 'include' })
      .then(r => r.json())
      .then((data: Prefs) => {
        if (!data) return;
        setPrefs(data);
        setExamDate(data.target_exam_date ?? '');
        setDailyTarget(data.daily_target_questions ?? 25);
        setWeekdayMin(data.weekday_minutes ?? 30);
        setWeekendMin(data.weekend_minutes ?? 60);
        setStrongs(Array.isArray(data.strong_sections) ? data.strong_sections : []);
        setWeak(data.weak_section ?? '');
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSave() {
    setSubmitting(true);
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
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErrorMsg((e as Error).message || '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-jigen-gold/40 bg-jigen-bg-panel px-3 py-1.5 text-xs text-jigen-gold hover:bg-jigen-bg-panel-2"
      >
        <Settings2 aria-hidden className="h-3.5 w-3.5" />
        学習設定
      </button>

      <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink">
          <DialogHeader>
            <DialogTitle className="text-jigen-ink">学習設定の変更</DialogTitle>
            <DialogDescription className="text-jigen-ink-soft">
              試験日・1日の目標問題数・学習時間などを変更できます。
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-jigen-gold" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* 試験日 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-jigen-gold">試験日</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink"
                />
              </div>

              {/* 1日の目標問題数 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-jigen-gold">1日の目標問題数</label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_OPTIONS.map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDailyTarget(opt.v)}
                      className={cn(
                        'rounded-lg border p-2.5 text-left text-xs',
                        dailyTarget === opt.v
                          ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                          : 'border-jigen-border-soft bg-jigen-bg-dark text-jigen-ink hover:border-jigen-gold/40',
                      )}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-[10px] text-jigen-ink-soft">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 平日・週末時間 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-jigen-gold">平日(分/日)</label>
                  <input
                    type="number"
                    min={5} max={240}
                    value={weekdayMin}
                    onChange={(e) => setWeekdayMin(parseInt(e.target.value, 10) || 30)}
                    className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-jigen-gold">週末(分/日)</label>
                  <input
                    type="number"
                    min={5} max={480}
                    value={weekendMin}
                    onChange={(e) => setWeekendMin(parseInt(e.target.value, 10) || 60)}
                    className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-dark px-3 py-2 text-sm text-jigen-ink"
                  />
                </div>
              </div>

              {/* 強い教科 */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-jigen-gold">自信のある教科(複数選択可)</label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTIONS.map(sec => {
                    const picked = strongs.includes(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setStrongs(picked ? strongs.filter(s => s !== sec) : [...strongs, sec]);
                        }}
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
                <label className="mb-1.5 block text-xs font-semibold text-jigen-gold">一番苦手な教科</label>
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
            </div>
          )}

          {errorMsg ? <p className="text-xs text-jigen-warning">{errorMsg}</p> : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="!bg-transparent border border-jigen-border-soft text-jigen-ink"
            >
              <X className="mr-1 h-4 w-4" />キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={submitting || loading}
              className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
            >
              {submitting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />保存中...</> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
