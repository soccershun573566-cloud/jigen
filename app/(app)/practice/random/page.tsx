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
import { QUEUE_KEY } from '@/lib/practice/queue';
import { readResume, clearResume, writeResume } from '@/lib/practice/resume-storage';

type Phase = 'loading' | 'error' | 'ready';

const QUEUE_TARGET = 10; // 常にここまで先読みしておく(テンポ重視・2026-06-09 5→10に拡張)
const QUEUE_PARALLEL = 3; // バックグラウンド補充時の同時 fetch 数(3並列)

type CachedQuestion = PracticeNextResponse & {
  choices?: unknown;
  isNumeric?: boolean;
  todaySolved?: number;
  todayTarget?: number;
};

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

// キューを target 件まで補充(バックグラウンド・並列バッチ)
// 旧: 逐次1問ずつ取得(target×RTT)
// 新: 不足分を最大 QUEUE_PARALLEL 並列で取りに行く(数分の1の時間)
async function refillQueue(currentId: string | null) {
  let queue = readQueue();
  // 現在表示中の問題と重複する場合は除外
  if (currentId) {
    queue = queue.filter((q) => q.id !== currentId);
    writeQueue(queue);
  }

  // 不足数を計算して、 並列バッチで補充
  while (queue.length < QUEUE_TARGET) {
    const need = QUEUE_TARGET - queue.length;
    const batch = Math.min(need, QUEUE_PARALLEL);
    const fetched = await Promise.all(Array.from({ length: batch }, () => fetchOne()));
    let appended = 0;
    for (const next of fetched) {
      if (!next) continue;
      if (currentId && next.id === currentId) continue;
      if (queue.some((q) => q.id === next.id)) continue;
      queue.push(next);
      appended++;
    }
    writeQueue(queue);
    // 1問も追加できなかったら(全部重複/エラー)、 無限ループ防止で抜ける
    if (appended === 0) break;
  }
}

export default function PracticeRandomPage() {
  const searchParams = useSearchParams();
  const tQuery = searchParams.get('t');
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('読み込みに失敗しました');
  const [reloadKey, setReloadKey] = useState(0);
  const [question, setQuestion] = useState<RunnerQuestion | null>(null);
  // ジゲンAI v2: 今日の進捗(楽観更新)
  // 中断時に保存された snapshot を初期値に。 サーバ値で上書きするときは Math.max で保護
  // (INSERT 反映前のサーバ集計が 0 を返しても、 楽観 +1 の値を巻き戻さないため)
  const [todaySolved, setTodaySolved] = useState<number | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem('jigen_today_solved_snapshot_v1');
      if (raw == null) return undefined;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : undefined;
    } catch { return undefined; }
  });
  const [todayTarget, setTodayTarget] = useState<number | undefined>(undefined);
  // 中断状態から再開時に渡す初期選択
  const [initialSelectedIdx, setInitialSelectedIdx] = useState<number | null>(null);
  const [initialSelectedNums, setInitialSelectedNums] = useState<number[]>([]);
  const refillingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setQuestion(null);

    (async () => {
      try {
        // 0) 中断状態 (localStorage) があれば最優先で再開
        const resume = readResume();
        let chosen: CachedQuestion | null = null;
        let isResumed = false;
        if (resume?.question) {
          chosen = resume.question as CachedQuestion;
          isResumed = true;
          setInitialSelectedIdx(resume.selectedIdx ?? null);
          setInitialSelectedNums(resume.selectedNums ?? []);
        }

        // 1) sessionStorage から取り出し試行
        if (!chosen) {
          const queue = readQueue();
          if (queue.length > 0) {
            chosen = queue.shift()!;
            writeQueue(queue);
          }
        }

        // 2) キューが空なら API で 1問取得
        if (!chosen) {
          chosen = await fetchOne();
        }

        if (cancelled) return;
        if (!chosen) throw new Error('問題が取得できませんでした');

        setQuestion(buildRunnerQuestion(chosen));
        // サーバの今日の進捗で同期(キャッシュより新鮮)
        // ただし、 楽観 +1 や中断時 snapshot より小さい値で上書きしないように Math.max で保護
        if (typeof chosen.todaySolved === 'number') {
          const serverVal = chosen.todaySolved;
          setTodaySolved((prev) => typeof prev === 'number' ? Math.max(prev, serverVal) : serverVal);
        }
        if (typeof chosen.todayTarget === 'number') setTodayTarget(chosen.todayTarget);
        // 新規問題なら中断状態として保存(選択は空)
        if (!isResumed) {
          writeResume({ question: chosen, selectedIdx: null, selectedNums: [] });
        }
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

  // 「次の問題へ」を URLナビなしで瞬間切替する
  // - キュー先頭から取り出して新 question を state にセット
  // - PracticeRunner は key 変更で unmount/remount → 内部 state 全リセット
  // - 同時にバックグラウンドでキュー補充
  async function handleNextInline() {
    // 中断状態は次の問題に進む時点でクリア
    clearResume();
    let queue = readQueue();
    let next: CachedQuestion | null = null;
    if (queue.length > 0) {
      next = queue.shift()!;
      writeQueue(queue);
    } else {
      // キュー空はレアケース(プリフェッチ間に合わず)
      next = await fetchOne();
    }
    if (next) {
      setQuestion(buildRunnerQuestion(next));
      // 次の問題のレスポンスに乗ってきた todaySolved でサーバ同期
      // ただし楽観 +1 した値より小さい場合は楽観値を維持(サーバの INSERT 反映遅延対策)
      if (typeof next.todaySolved === 'number') {
        const serverVal = next.todaySolved;
        setTodaySolved((prev) => typeof prev === 'number' ? Math.max(prev, serverVal) : serverVal);
      }
      if (typeof next.todayTarget === 'number') setTodayTarget(next.todayTarget);
      // 次の問題を再開対象として保存
      writeResume({ question: next, selectedIdx: null, selectedNums: [] });
      // 再開用の初期選択もクリア(新規問題なので0から)
      setInitialSelectedIdx(null);
      setInitialSelectedNums([]);
      // バックグラウンドでキュー補充(現在表示中のIDを除外)
      if (!refillingRef.current) {
        refillingRef.current = true;
        refillQueue(next.id).finally(() => {
          refillingRef.current = false;
        });
      }
    }
  }

  if (phase === 'ready' && question) {
    // key に question.id を渡して、問題切替時に PracticeRunner を unmount/remount させる
    // (これがないと selectedIdx, phase, result などの state が前問のまま残ってしまう)
    return (
      <PracticeRunner
        key={question.id}
        question={question}
        onNext={handleNextInline}
        todaySolved={todaySolved}
        todayTarget={todayTarget}
        initialSelectedIdx={initialSelectedIdx}
        initialSelectedNums={initialSelectedNums}
        onAnsweredDaily={() => setTodaySolved((n) => (typeof n === 'number' ? n + 1 : 1))}
        onTodayReset={() => setTodaySolved(0)}
      />
    );
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
