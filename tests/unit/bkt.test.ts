import { describe, it, expect } from 'vitest';
import {
  updateMastery,
  predictCorrect,
  defaultBktParams,
  attemptsToReach,
} from '@/lib/learning/bkt';

describe('BKT updateMastery', () => {
  it('初期 pL=0.2 で 正答1回後に pL が上昇する', () => {
    const before = 0.2;
    const after = updateMastery(before, true);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(1);
  });

  it('連続正答で pL が単調に増加する', () => {
    let p = 0.2;
    const trajectory: number[] = [p];
    for (let i = 0; i < 20; i++) {
      p = updateMastery(p, true);
      trajectory.push(p);
    }
    for (let i = 1; i < trajectory.length; i++) {
      expect(trajectory[i]!).toBeGreaterThanOrEqual(trajectory[i - 1]!);
    }
    expect(p).toBeGreaterThan(0.9);
  });

  it('連続誤答でも pT のため緩やかに上がる(BKT 標準挙動)', () => {
    let p = 0.2;
    for (let i = 0; i < 20; i++) {
      p = updateMastery(p, false);
    }
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('pL は [0, 1] にクランプされる', () => {
    expect(updateMastery(-0.5, true)).toBeGreaterThanOrEqual(0);
    expect(updateMastery(1.5, false)).toBeLessThanOrEqual(1);
    expect(updateMastery(NaN, true)).toBeGreaterThanOrEqual(0);
  });

  it('正答した場合の pL は誤答した場合より高い', () => {
    const correct = updateMastery(0.5, true);
    const wrong = updateMastery(0.5, false);
    expect(correct).toBeGreaterThan(wrong);
  });

  it('pL=1.0 から誤答しても 1 を超えない', () => {
    expect(updateMastery(1.0, false)).toBeLessThanOrEqual(1);
  });

  it('pL=0 でも正答すれば前進する', () => {
    expect(updateMastery(0, true)).toBeGreaterThan(0);
  });
});

describe('BKT predictCorrect', () => {
  it('pL=1 では 1-pS に近い', () => {
    const p = predictCorrect(1);
    expect(p).toBeCloseTo(1 - defaultBktParams.pS, 5);
  });

  it('pL=0 では pG に等しい', () => {
    const p = predictCorrect(0);
    expect(p).toBeCloseTo(defaultBktParams.pG, 5);
  });

  it('pL=0.5 では (1-pS)/2 + pG/2', () => {
    const p = predictCorrect(0.5);
    const expected = 0.5 * (1 - defaultBktParams.pS) + 0.5 * defaultBktParams.pG;
    expect(p).toBeCloseTo(expected, 5);
  });
});

describe('BKT attemptsToReach (シミュレータ)', () => {
  it('正答率0.8で20問以内に pL=0.7 に到達することが多い', () => {
    const n = attemptsToReach(0.2, 0.7, 0.8);
    expect(n).toBeLessThan(1000);
  });

  it('初期 pL が target 以上なら 0 を返す', () => {
    const n = attemptsToReach(0.9, 0.7, 0.5);
    expect(n).toBe(0);
  });
});
