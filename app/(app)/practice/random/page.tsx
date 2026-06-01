'use client';

// /practice/random — ランダム1問を取得して、その場で表示
// 高速化:
//   - sessionStorage に「3問先まで」のキューを保持し、キューから取り出し → 即表示
//   - 表示後にバックグラウンドでキュー補充
//   - 「次の問題へ」→ キューから即取り出し → 読み込み中表示なし
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';
import { Button } from '@/components/ui/button';
import { PracticeRunner, type RunnerQuestion } from '@/components/practice/PracticeRunner';
import type { PracticeNextResponse } from '@/types/api';

type Phase = 'loading' | 'error' | 'ready';

const QUEUE_KEY = 'jigen_question_queue_v1';
const QUEUE_TARGET = 3; // 常にここまで先読みしておく

type CachedQuestion = PracticeNextResponse & { choices?: unknown; isNumeric?: boolean };

function extractChoices(choicesRaw: unknown): string[] {
  if (Array.isArray(choicesRaw)) {
    return (choicesRaw as unknown[]).filter((x) => typeof x === 'string') as string[];
  }
  if (choicesRaw && typeof choicesRaw === 'object') {
    const items = (choicesRaw as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return (items as unknown[]).filter((x) => typeof x === 'string') as string[];
    }
  }
  return [];
}

function buildRunnerQuestion(data: CachedQuestion): RunnerQuestion {
  return {
    id: data.id,
    year: data.year,
    qNumber: data.qNumber,
    section: data.section,
    subTopic: data.subTopic,
    bodyMd: data.bodyMd,
    choices: extractChoices(data.choices),
    isNumeric: !!data.isNumeric,
  };
}

function readQueue(): CachedQuestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(q: CachedQuestion[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

async function fetchOne(): Promise<CachedQuestion | null> {
  const res = await fetch('/api/practice/next', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as CachedQuestion;
  return data?.id ? data : null;
}

// キューを target 件まで補充(バックグラウンド)
async function refillQueue(currentId: string | null) {
  let queue = readQueue();
  // 現在表示中の問題と重複する場合は除外
  if (currentId) {
    queue = queue.filter((q) => q.id !== currentId);
    writeQueue(queue);
  }

  while (queue.length < QUEUE_TARGET) {
    const next = await fetchOne();
    if (!next) break;
    // 重複排除(キュー内 + 現在表示中)
    if (currentId && next.id === currentId) continue;
    if (queue.some((q) => q.id === next.id)) continue;
    queue.push(next);
    writeQueue(queue);
  }
}

export default function PracticeRandomPage() {
  const searchParams = useSearchParams();
  const tQuery = searchParams.get('t');
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('読み込みに失敗しました');
  const [reloadKey, setReloadKey] = useState(0);
  const [question, setQuestion] = useState<RunnerQuestion | null>(null);
  const refillingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setQuestion(null);

    (async () => {
      try {
        // 1) sessionStorage から取り出し試行
        const queue = readQueue();
        let chosen: CachedQuestion | null = null;
        if (queue.length > 0) {
          chosen = queue.shift()!;
          writeQueue(queue);
        }

        // 2) キューが空なら API で 1問取得
        if (!chosen) {
          chosen = await fetchOne();
        }

        if (cancelled) return;
        if (!chosen) throw new Error('問題が取得できませんでした');

        setQuestion(buildRunnerQuestion(chosen));
        setPhase('ready');

        // 3) バックグラウンドでキュー補充(QUEUE_TARGET件まで)
        if (!refillingRef.current) {
          refillingRef.current = true;
          refillQueue(chosen.id).finally(() => {
            refillingRef.current = false;
          });
        }
      } catch (e) {
        if (cancelled) return;
        setErrorMessage((e as Error).message || '読み込みに失敗しました');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, tQuery]);

  if (phase === 'ready' && question) {
    // key に question.id を渡して、問題切替時に PracticeRunner を unmount/remount させる
    // (これがないと selectedIdx, phase, result などの state が前問のまま残ってしまう)
    return <PracticeRunner key={question.id} question={question} />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-jigen-ink">
      {phase === 'loading' ? (
        <>
          <div className="animate-pulse">
            <TiranoSensei size="lg" glow label="ティラノ先生が選んでいます" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
              Loading
            </p>
            <p className="text-sm text-jigen-ink-soft">
              次の問題を選んでいます...
            </p>
          </div>
          <span className="sr-only" aria-live="polite">
            問題を読み込み中です
          </span>
        </>
      ) : null}

      {phase === 'error' ? (
        <>
          <TiranoSensei size="md" label="ティラノ先生" />
          <div className="space-y-2 text-center">
            <p className="text-base font-semibold text-jigen-ink">
              読み込みに失敗しました
            </p>
            <p className="text-xs text-jigen-ink-mute">{errorMessage}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setReloadKey((k) => k + 1)}
              className="bg-gold-gradient text-jigen-bg-dark hover:opacity-90"
            >
              再読み込み
            </Button>
            <Link
              href="/practice"
              className="text-center text-xs text-jigen-ink-mute underline-offset-4 hover:text-jigen-gold hover:underline"
            >
              演習トップに戻る
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
