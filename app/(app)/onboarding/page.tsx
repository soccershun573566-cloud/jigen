// /onboarding — 初回質問(8問・約2分で完了)
// 完了後 /mock-exam/initial-50 へリダイレクト
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Brain, Calendar, Check, ChevronLeft, ChevronRight, Clock, Loader2, Target } from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { cn } from '@/lib/utils';

type Form = {
  attemptHistory: 'first' | 'failed_once' | 'failed_multi' | '';
  weekdayMinutes: number;
  weekendMinutes: number;
  dailyTargetQuestions: number;
  studyStyle: 'self' | 'cram_school' | 'online' | '';
  strongSections: string[];
  weakSection: string;
  notificationMorningAt: string;
  notificationEnabled: boolean;
};

const SECTIONS = ['建築学一般', '施工管理法', '法規', 'その他'];
const TIME_OPTIONS = [
  { v: 15, label: '15分以下' },
  { v: 30, label: '30分' },
  { v: 60, label: '1時間' },
  { v: 120, label: '2時間以上' },
];
const WEEKEND_OPTIONS = [
  { v: 30, label: '30分以下' },
  { v: 60, label: '1時間' },
  { v: 120, label: '2時間' },
  { v: 240, label: '4時間以上' },
];
const TARGET_OPTIONS = [
  { v: 10, label: '10問', desc: 'スキマ時間で軽く' },
  { v: 25, label: '25問', desc: '標準ペース(おすすめ)' },
  { v: 50, label: '50問', desc: 'がっつり詰める' },
  { v: 100, label: '100問', desc: '直前駆け込み層' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState<Form>({
    attemptHistory: '',
    weekdayMinutes: 30,
    weekendMinutes: 60,
    dailyTargetQuestions: 25,
    studyStyle: '',
    strongSections: [],
    weakSection: '',
    notificationMorningAt: '07:00',
    notificationEnabled: true,
  });

  const steps = [
    {
      key: 'attempt',
      title: 'これまでの受験経験は?',
      sub: '初受験/再受験で出題傾向が変わります',
      valid: !!form.attemptHistory,
    },
    {
      key: 'weekday',
      title: '平日に確保できる学習時間',
      sub: '無理のないペースを一緒に作ります',
      valid: !!form.weekdayMinutes,
    },
    {
      key: 'weekend',
      title: '週末に確保できる学習時間',
      sub: '休日のペースも教えてください',
      valid: !!form.weekendMinutes,
    },
    {
      key: 'target',
      title: '1日の目標問題数を選んでください',
      sub: '後でプロフィールから変更できます',
      valid: !!form.dailyTargetQuestions,
    },
    {
      key: 'style',
      title: 'これまでの学習スタイル',
      sub: 'ジゲンと並行/単独どちらで使うか把握します',
      valid: !!form.studyStyle,
    },
    {
      key: 'strong',
      title: '自信のある教科(複数選択可)',
      sub: '全部苦手なら何も選ばずに「次へ」',
      valid: true,
    },
    {
      key: 'weak',
      title: '一番苦手な教科は?',
      sub: 'ここを最優先で攻略します',
      valid: !!form.weakSection,
    },
    {
      key: 'notify',
      title: '朝の学習リマインダー',
      sub: '時刻はいつでも設定で変えられます',
      valid: true,
    },
  ];

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      // 完了 → 初回模試へ
      router.push('/mock-exam/initial-50');
    } catch (e) {
      setErrorMsg((e as Error).message || '送信に失敗しました');
      setSubmitting(false);
    }
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progressPct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-6 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-6 flex items-center gap-3">
        <TiranoSensei size="sm" glow />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-jigen-gold">Welcome</p>
          <p className="text-sm font-bold text-jigen-ink">いくつか質問させてください</p>
        </div>
        <span className="text-xs text-jigen-ink-mute">{step + 1}/{steps.length}</span>
      </div>

      {/* プログレスバー */}
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-jigen-bg-panel-2">
        <div className="h-full bg-gold-gradient transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* 質問本体 */}
      <section className="mb-6 rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-6 shadow-panel">
        <h2 className="mb-2 text-xl font-extrabold tracking-tight text-jigen-ink">{current.title}</h2>
        <p className="mb-5 text-xs text-jigen-ink-soft">{current.sub}</p>

        {/* Step 0: 受験経験 */}
        {current.key === 'attempt' && (
          <div className="grid gap-2">
            {([
              { v: 'first', label: '初受験です' },
              { v: 'failed_once', label: '1回不合格' },
              { v: 'failed_multi', label: '2回以上不合格' },
            ] as const).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm({ ...form, attemptHistory: opt.v })}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm',
                  form.attemptHistory === opt.v
                    ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                    : 'border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink hover:border-jigen-gold/40',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: 平日 */}
        {current.key === 'weekday' && (
          <div className="grid grid-cols-2 gap-2">
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm({ ...form, weekdayMinutes: opt.v })}
                className={cn(
                  'rounded-lg border p-3 text-center text-sm',
                  form.weekdayMinutes === opt.v
                    ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                    : 'border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink hover:border-jigen-gold/40',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 3: 週末 */}
        {current.key === 'weekend' && (
          <div className="grid grid-cols-2 gap-2">
            {WEEKEND_OPTIONS.map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm({ ...form, weekendMinutes: opt.v })}
                className={cn(
                  'rounded-lg border p-3 text-center text-sm',
                  form.weekendMinutes === opt.v
                    ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                    : 'border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink hover:border-jigen-gold/40',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 3.5: 1日の目標問題数 */}
        {current.key === 'target' && (
          <div className="grid gap-2">
            {TARGET_OPTIONS.map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm({ ...form, dailyTargetQuestions: opt.v })}
                className={cn(
                  'rounded-lg border p-3 text-left',
                  form.dailyTargetQuestions === opt.v
                    ? 'border-jigen-gold bg-jigen-gold/10'
                    : 'border-jigen-border-soft bg-jigen-bg-panel hover:border-jigen-gold/40',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className={cn('text-base font-bold', form.dailyTargetQuestions === opt.v ? 'text-jigen-gold' : 'text-jigen-ink')}>{opt.label}</span>
                  <span className="text-[11px] text-jigen-ink-soft">{opt.desc}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: 学習スタイル */}
        {current.key === 'style' && (
          <div className="grid gap-2">
            {([
              { v: 'self', label: '完全独学', desc: '過去問・YouTube中心' },
              { v: 'online', label: '通信講座経験あり', desc: 'SAT・アガルート等' },
              { v: 'cram_school', label: '通学経験あり', desc: '総合資格・日建学院等' },
            ] as const).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm({ ...form, studyStyle: opt.v })}
                className={cn(
                  'rounded-lg border p-3 text-left',
                  form.studyStyle === opt.v
                    ? 'border-jigen-gold bg-jigen-gold/10'
                    : 'border-jigen-border-soft bg-jigen-bg-panel hover:border-jigen-gold/40',
                )}
              >
                <p className={cn('text-sm font-semibold', form.studyStyle === opt.v ? 'text-jigen-gold' : 'text-jigen-ink')}>{opt.label}</p>
                <p className="text-[11px] text-jigen-ink-soft">{opt.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 5: 強い教科(複数) */}
        {current.key === 'strong' && (
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map(sec => {
              const picked = form.strongSections.includes(sec);
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      strongSections: picked
                        ? form.strongSections.filter(s => s !== sec)
                        : [...form.strongSections, sec],
                    });
                  }}
                  className={cn(
                    'rounded-lg border p-3 text-center text-sm',
                    picked
                      ? 'border-jigen-gold bg-jigen-gold/10 text-jigen-gold'
                      : 'border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink hover:border-jigen-gold/40',
                  )}
                >
                  {picked ? '✓ ' : ''}{sec}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 6: 苦手な教科 */}
        {current.key === 'weak' && (
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => setForm({ ...form, weakSection: sec })}
                className={cn(
                  'rounded-lg border p-3 text-center text-sm',
                  form.weakSection === sec
                    ? 'border-jigen-warning bg-jigen-warning-soft/30 text-jigen-warning'
                    : 'border-jigen-border-soft bg-jigen-bg-panel text-jigen-ink hover:border-jigen-warning/40',
                )}
              >
                {sec}
              </button>
            ))}
          </div>
        )}

        {/* Step 7: 通知 */}
        {current.key === 'notify' && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-jigen-border-soft bg-jigen-bg-panel p-3">
              <input
                type="checkbox"
                checked={form.notificationEnabled}
                onChange={(e) => setForm({ ...form, notificationEnabled: e.target.checked })}
              />
              <span className="text-sm text-jigen-ink">朝のリマインダーをONにする</span>
            </label>
            {form.notificationEnabled ? (
              <div>
                <label className="mb-2 block text-xs text-jigen-ink-soft">時刻</label>
                <input
                  type="time"
                  value={form.notificationMorningAt}
                  onChange={(e) => setForm({ ...form, notificationMorningAt: e.target.value })}
                  className="w-full rounded-lg border border-jigen-border-soft bg-jigen-bg-panel px-4 py-3 text-base text-jigen-ink"
                />
              </div>
            ) : null}
            <p className="text-[11px] text-jigen-ink-mute">後で設定からいつでも変更可能です。</p>
          </div>
        )}
      </section>

      {errorMsg ? <p className="mb-4 text-center text-xs text-jigen-warning">{errorMsg}</p> : null}

      {/* ナビ */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="inline-flex items-center gap-1 rounded-md border border-jigen-border-soft bg-jigen-bg-panel px-4 py-2 text-sm text-jigen-ink disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />前へ
        </button>
        {!isLast ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!current.valid || submitting}
            className="inline-flex items-center gap-1 rounded-md bg-gold-gradient px-5 py-2 text-sm font-bold text-jigen-bg-dark disabled:opacity-40"
          >
            次へ <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!current.valid || submitting}
            className="inline-flex items-center gap-2 rounded-md bg-gold-gradient px-6 py-2.5 text-sm font-bold text-jigen-bg-dark disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />送信中...</> : <><Check className="h-4 w-4" />完了して模試へ</>}
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-jigen-ink-mute">
        所要時間 約2分 / すべて後から変更可能
      </p>
    </main>
  );
}
