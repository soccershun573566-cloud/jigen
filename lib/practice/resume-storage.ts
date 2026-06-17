/**
 * 演習中断時の状態保存・再開ヘルパー(localStorage)
 *
 * 「中断する」 を押したとき、 現在表示中の問題と未送信の選択状態を保存。
 * 戻ってきたときに同じ問題から続きを解けるようにする。
 *
 * - 採点成功時 / 次の問題へ進んだ時 / 24時間経過時 に clear する
 * - 保存形式は「問題そのもの + 選択状態」 だけ。 attempts は触らない
 */
import type { PracticeNextResponse } from '@/types/api';

export const RESUME_KEY = 'jigen_practice_resume_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // 24時間で破棄

export type ResumeState = {
  /** 中断時に表示していた問題(再開時にそのまま表示) */
  question: PracticeNextResponse;
  /** 単一選択(四肢択一)で選んでいた選択肢番号(1始まり) */
  selectedIdx?: number | null;
  /** 複数選択(応用) で選んでいた選択肢番号集合(1始まり) */
  selectedNums?: number[];
  /** 中断時の経過時間(秒) — 再開時に加算するため */
  elapsedSeconds?: number;
  /** いつ保存したか(TTL用) */
  savedAt: number;
};

export function readResume(): ResumeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (!parsed?.question?.id) return null;
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(RESUME_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeResume(state: Omit<ResumeState, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {/* QuotaExceededError等は無視 */}
}

export function clearResume(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {/* */}
}

/** 既存の中断状態の選択肢だけを更新(質問は変えない) */
export function updateResumeSelection(selectedIdx: number | null, selectedNums: number[]): void {
  const prev = readResume();
  if (!prev) return;
  writeResume({ ...prev, selectedIdx, selectedNums });
}
