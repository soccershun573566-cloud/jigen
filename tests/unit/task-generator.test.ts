import { describe, it, expect } from 'vitest';
import {
  buildTaskForUser,
  targetQuestionCount,
  decideComposition,
  allocateCounts,
  pickReviewCandidates,
  pickWeakCandidates,
  type MasteryInput,
  type QuestionInput,
  type AttemptHistoryInput,
} from '@/lib/learning/task-generator';

const NOW = new Date('2026-05-29T00:00:00Z');

function mkQuestion(
  id: string,
  subTopic: string,
  difficulty: number,
  isNumeric = false,
): QuestionInput {
  return { id, subTopic, difficulty, isNumeric, published: true };
}

function mkMastery(
  subTopic: string,
  masteryP: number,
  due: boolean,
): MasteryInput {
  return {
    subTopic,
    masteryP,
    nextReviewAt: due ? new Date(NOW.getTime() - 60 * 1000) : new Date(NOW.getTime() + 7 * 86400 * 1000),
    lastPracticedAt: new Date(NOW.getTime() - 86400 * 1000),
    attemptsCount: 5,
  };
}

describe('targetQuestionCount', () => {
  it('平日15分なら 10 問', () => {
    const n = targetQuestionCount({
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 5,
    });
    expect(n).toBe(10);
  });

  it('連続日数 < 3 は 0.7 倍', () => {
    const n = targetQuestionCount({
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 1,
    });
    expect(n).toBe(7);
  });

  it('繁忙期は 5 問固定', () => {
    const n = targetQuestionCount({
      weekdayMinutes: 60,
      weekendMinutes: 120,
      isWeekend: true,
      isBusyMode: true,
      streakCount: 30,
    });
    expect(n).toBe(5);
  });

  it('連続日数 >= 14 は 1.2 倍まで許容', () => {
    const n = targetQuestionCount({
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 20,
    });
    expect(n).toBeGreaterThanOrEqual(10);
  });
});

describe('decideComposition', () => {
  it('習熟度 < 0.3 は 5:3:2', () => {
    expect(decideComposition(0.2)).toEqual({ new: 5, review: 3, weak: 2 });
  });
  it('習熟度 > 0.7 は 2:3:5', () => {
    expect(decideComposition(0.8)).toEqual({ new: 2, review: 3, weak: 5 });
  });
  it('中間は 3:5:2', () => {
    expect(decideComposition(0.5)).toEqual({ new: 3, review: 5, weak: 2 });
  });
});

describe('allocateCounts', () => {
  it('比率通りに分配し端数は review に寄せる', () => {
    const c = allocateCounts(10, { new: 3, review: 5, weak: 2 });
    expect(c.new + c.review + c.weak).toBe(10);
    expect(c.new).toBe(3);
    expect(c.weak).toBe(2);
  });
});

describe('pickReviewCandidates / pickWeakCandidates', () => {
  it('next_review_at <= now の sub_topic だけ復習対象', () => {
    const mastery = [
      mkMastery('A', 0.5, true),
      mkMastery('B', 0.5, false),
    ];
    const pool = [mkQuestion('q1', 'A', 0.5), mkQuestion('q2', 'B', 0.5)];
    const result = pickReviewCandidates(mastery, pool, NOW);
    expect(result.map((q) => q.id)).toEqual(['q1']);
  });

  it('下位 30% を弱点候補に', () => {
    const mastery = [
      mkMastery('A', 0.1, false),
      mkMastery('B', 0.5, false),
      mkMastery('C', 0.9, false),
    ];
    const pool = [
      mkQuestion('qA', 'A', 0.5),
      mkQuestion('qB', 'B', 0.5),
      mkQuestion('qC', 'C', 0.5),
    ];
    const result = pickWeakCandidates(mastery, pool);
    expect(result.map((q) => q.id)).toEqual(['qA']);
  });
});

describe('buildTaskForUser シナリオ', () => {
  it('シナリオ1: 新規ユーザー(mastery 無し、新規のみ)', () => {
    const pool: QuestionInput[] = [];
    for (let i = 0; i < 30; i++) {
      pool.push(mkQuestion(`q${i}`, `topic${i % 5}`, 0.2 + (i % 3) * 0.05));
    }
    const task = buildTaskForUser({
      userId: 'u1',
      targetDate: '2026-05-29',
      now: NOW,
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 0,
      masteryProfiles: [],
      recentAttempts: [],
      questionPool: pool,
    });
    expect(task.questionIds.length).toBeGreaterThan(0);
    expect(task.questionIds.length).toBeLessThanOrEqual(7); // 連続日数<3 で 0.7 倍
    expect(task.composition.new).toBeGreaterThan(0);
    expect(task.reasonMd).toContain('今日のセット');
  });

  it('シナリオ2: 復習期日が来ている単元を優先で含める', () => {
    const mastery = [
      mkMastery('A', 0.5, true),  // 復習期日 OK
      mkMastery('B', 0.5, false),
    ];
    const pool = [
      mkQuestion('q1', 'A', 0.5),
      mkQuestion('q2', 'A', 0.5),
      mkQuestion('q3', 'B', 0.5),
    ];
    const task = buildTaskForUser({
      userId: 'u1',
      targetDate: '2026-05-29',
      now: NOW,
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 5,
      masteryProfiles: mastery,
      recentAttempts: [],
      questionPool: pool,
    });
    // 'A' の問題が含まれる
    const subTopics = task.questionIds.map(
      (id) => pool.find((q) => q.id === id)!.subTopic,
    );
    expect(subTopics).toContain('A');
  });

  it('シナリオ3: 数値判定問題が週内 3 問未満なら優先', () => {
    const mastery = [mkMastery('A', 0.5, true)];
    const pool: QuestionInput[] = [
      mkQuestion('n1', 'A', 0.5, true),
      mkQuestion('n2', 'A', 0.5, true),
      mkQuestion('n3', 'A', 0.5, true),
      mkQuestion('c1', 'A', 0.5, false),
      mkQuestion('c2', 'A', 0.5, false),
    ];
    const task = buildTaskForUser({
      userId: 'u1',
      targetDate: '2026-05-29',
      now: NOW,
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 5,
      masteryProfiles: mastery,
      recentAttempts: [], // 数値演習 0 件
      questionPool: pool,
    });
    const numericIncluded = task.questionIds.filter((id) =>
      pool.find((q) => q.id === id)!.isNumeric,
    ).length;
    expect(numericIncluded).toBeGreaterThanOrEqual(1);
  });

  it('シナリオ4: 24時間以内に出題した問題は除外', () => {
    const mastery = [mkMastery('A', 0.5, true)];
    const recent: AttemptHistoryInput[] = [
      {
        questionId: 'q1',
        subTopic: 'A',
        isCorrect: true,
        isNearMiss: false,
        isNumeric: false,
        attemptedAt: new Date(NOW.getTime() - 60 * 60 * 1000), // 1時間前
      },
    ];
    const pool = [
      mkQuestion('q1', 'A', 0.5),
      mkQuestion('q2', 'A', 0.5),
      mkQuestion('q3', 'A', 0.5),
    ];
    const task = buildTaskForUser({
      userId: 'u1',
      targetDate: '2026-05-29',
      now: NOW,
      weekdayMinutes: 15,
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 5,
      masteryProfiles: mastery,
      recentAttempts: recent,
      questionPool: pool,
    });
    expect(task.questionIds).not.toContain('q1');
  });

  it('シナリオ5: 同一 sub_topic は 1 日 3 問まで', () => {
    const mastery = [mkMastery('A', 0.5, true)];
    const pool: QuestionInput[] = [];
    for (let i = 0; i < 10; i++) {
      pool.push(mkQuestion(`q${i}`, 'A', 0.5));
    }
    const task = buildTaskForUser({
      userId: 'u1',
      targetDate: '2026-05-29',
      now: NOW,
      weekdayMinutes: 60, // 多めに学習可能 → 全部 A になりがちな状況
      weekendMinutes: 60,
      isWeekend: false,
      isBusyMode: false,
      streakCount: 5,
      masteryProfiles: mastery,
      recentAttempts: [],
      questionPool: pool,
    });
    expect(task.questionIds.length).toBeLessThanOrEqual(3);
  });
});
