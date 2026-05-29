import { describe, it, expect } from 'vitest';
import {
  nextTargetDifficulty,
  recentCorrectRate,
  targetDifficultyFromMastery,
} from '@/lib/learning/difficulty';

function mkAttempts(isCorrectArr: boolean[]) {
  const base = new Date('2026-05-29T00:00:00Z').getTime();
  return isCorrectArr.map((isCorrect, i) => ({
    isCorrect,
    attemptedAt: new Date(base + i * 60 * 1000),
  }));
}

describe('recentCorrectRate', () => {
  it('空配列は 0', () => {
    expect(recentCorrectRate([])).toBe(0);
  });

  it('直近 10 件で正答率を計算', () => {
    const a = mkAttempts([
      true, true, true, true, true, true, true, true, false, false,
    ]);
    expect(recentCorrectRate(a, 10)).toBe(0.8);
  });

  it('limit を超えた古いものは無視', () => {
    // 全部正答 + 古い誤答 100 件 → 直近 10 件は全部正答
    const arr: boolean[] = [];
    for (let i = 0; i < 100; i++) arr.push(false);
    for (let i = 0; i < 10; i++) arr.push(true);
    const a = mkAttempts(arr);
    expect(recentCorrectRate(a, 10)).toBe(1);
  });
});

describe('nextTargetDifficulty', () => {
  it('5 件未満は維持', () => {
    const a = mkAttempts([true, true]);
    expect(nextTargetDifficulty(0.5, a)).toBe(0.5);
  });

  it('70% 超で +0.1', () => {
    const a = mkAttempts([true, true, true, true, true, true, true, true, false, false]);
    expect(nextTargetDifficulty(0.5, a)).toBeCloseTo(0.6, 5);
  });

  it('40% 未満で -0.1', () => {
    const a = mkAttempts([true, true, false, false, false, false, false, false, false, false]);
    expect(nextTargetDifficulty(0.5, a)).toBeCloseTo(0.4, 5);
  });

  it('中間帯(40〜70%)は据え置き', () => {
    const a = mkAttempts([true, true, true, true, true, false, false, false, false, false]);
    expect(nextTargetDifficulty(0.5, a)).toBe(0.5);
  });

  it('上限 0.9 / 下限 0.1 にクランプ', () => {
    const allOk = mkAttempts(Array(10).fill(true));
    expect(nextTargetDifficulty(0.95, allOk)).toBeLessThanOrEqual(0.9);
    const allNg = mkAttempts(Array(10).fill(false));
    expect(nextTargetDifficulty(0.05, allNg)).toBeGreaterThanOrEqual(0.1);
  });
});

describe('targetDifficultyFromMastery', () => {
  it('mastery をクランプして返す', () => {
    expect(targetDifficultyFromMastery(0.5)).toBe(0.5);
    expect(targetDifficultyFromMastery(0)).toBe(0.1);
    expect(targetDifficultyFromMastery(1)).toBe(0.9);
  });
});
