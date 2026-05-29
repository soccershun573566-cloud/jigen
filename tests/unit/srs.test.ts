import { describe, it, expect } from 'vitest';
import {
  nextInterval,
  nextReviewAt,
  nextReviewForNumeric,
  nextReviewDate,
  deriveQuality,
} from '@/lib/learning/srs';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('SRS nextInterval', () => {
  it('quality < 3 では 1 日に戻る', () => {
    expect(nextInterval(10, 0)).toBe(1);
    expect(nextInterval(10, 2)).toBe(1);
  });

  it('quality 5 (完璧) では前回間隔より延びる', () => {
    expect(nextInterval(5, 5)).toBeGreaterThan(5);
  });

  it('quality 3 (ぎりぎり正答) でも 1 日以上', () => {
    expect(nextInterval(0, 3)).toBeGreaterThanOrEqual(1);
  });

  it('quality 4 (余裕の正答) は quality 3 より長い間隔', () => {
    expect(nextInterval(10, 4)).toBeGreaterThanOrEqual(nextInterval(10, 3));
  });

  it('quality を範囲外に投げても落ちない', () => {
    expect(nextInterval(5, -1)).toBe(1);
    expect(nextInterval(5, 99)).toBeGreaterThan(0);
  });

  it('prevDays=0 でも最低 1 日', () => {
    expect(nextInterval(0, 5)).toBeGreaterThanOrEqual(1);
  });
});

describe('SRS nextReviewAt', () => {
  it('現在時刻に interval を加算した Date を返す', () => {
    const now = new Date('2026-05-29T00:00:00Z');
    const next = nextReviewAt(now, 0, 5);
    const diff = next.getTime() - now.getTime();
    expect(diff).toBeGreaterThanOrEqual(DAY_MS);
  });
});

describe('SRS nextReviewForNumeric (数値判定問題の特別ロジック)', () => {
  const now = new Date('2026-05-29T00:00:00Z');

  it('正答なら通常 SM-2 経路で延伸', () => {
    const d = nextReviewForNumeric(now, 'correct', 5);
    expect(d.getTime()).toBeGreaterThan(now.getTime() + DAY_MS);
  });

  it('完全誤答(miss)は 1 日後', () => {
    const d = nextReviewForNumeric(now, 'miss', 10);
    expect(d.getTime()).toBe(now.getTime() + DAY_MS);
  });

  it('near_miss は 24〜72 時間後', () => {
    const d = nextReviewForNumeric(now, 'near_miss', 0, 0.5);
    const diffH = (d.getTime() - now.getTime()) / (60 * 60 * 1000);
    expect(diffH).toBeGreaterThanOrEqual(24);
    expect(diffH).toBeLessThanOrEqual(72);
  });

  it('near_miss で誤差比 0(=ほぼ正解)に近いほど復習を遅らせる', () => {
    const close = nextReviewForNumeric(now, 'near_miss', 0, 0.1);
    const far = nextReviewForNumeric(now, 'near_miss', 0, 0.9);
    expect(close.getTime()).toBeGreaterThan(far.getTime());
  });
});

describe('SRS nextReviewDate', () => {
  it('intervalDays 日後の Date を返す', () => {
    const now = new Date('2026-05-29T00:00:00Z');
    const d = nextReviewDate(now, 3);
    expect(d.getTime() - now.getTime()).toBe(3 * DAY_MS);
  });
});

describe('SRS deriveQuality', () => {
  it('速い正答は 5', () => {
    expect(
      deriveQuality({
        isCorrect: true,
        isNearMiss: false,
        isNumeric: false,
        responseSeconds: 10,
      }),
    ).toBe(5);
  });

  it('遅い正答は 3', () => {
    expect(
      deriveQuality({
        isCorrect: true,
        isNearMiss: false,
        isNumeric: false,
        responseSeconds: 200,
      }),
    ).toBe(3);
  });

  it('数値の near_miss は 2', () => {
    expect(
      deriveQuality({
        isCorrect: false,
        isNearMiss: true,
        isNumeric: true,
        responseSeconds: 60,
      }),
    ).toBe(2);
  });

  it('完全誤答は 0', () => {
    expect(
      deriveQuality({
        isCorrect: false,
        isNearMiss: false,
        isNumeric: false,
        responseSeconds: 60,
      }),
    ).toBe(0);
  });
});
