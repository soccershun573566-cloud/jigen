/**
 * 「今日のタスク」生成エンジン
 * タクト§5.3 / 技術構築計画§4.1, §4.3
 *
 * 純粋関数。DB アクセスはせず、呼び出し側が必要なデータを全て渡す。
 * Cron(全ユーザー一括)と /api/tasks/today(オンデマンド)から共有される。
 */

import { predictCorrect, defaultBktParams, type BktParams } from './bkt';

const AVG_MIN_PER_Q = 1.5;
const MAX_PER_SUB_TOPIC = 3;
const MIN_NUMERIC_PER_WEEK = 3;

export type TaskCompositionRatio = {
  new: number;
  review: number;
  weak: number;
};

export type TaskComposition = {
  new: number;
  review: number;
  weak: number;
};

export type GeneratedTask = {
  userId: string;
  targetDate: string; // YYYY-MM-DD (JST)
  questionIds: string[];
  composition: TaskComposition;
  reasonMd: string;
  estimatedMinutes: number;
};

export type MasteryInput = {
  subTopic: string;
  masteryP: number;
  nextReviewAt: Date | null;
  lastPracticedAt: Date | null;
  attemptsCount: number;
};

export type QuestionInput = {
  id: string;
  subTopic: string;
  difficulty: number;
  isNumeric: boolean;
  published: boolean;
};

export type AttemptHistoryInput = {
  questionId: string;
  subTopic: string;
  isCorrect: boolean;
  isNearMiss: boolean;
  isNumeric: boolean;
  attemptedAt: Date;
};

export type TaskGenInputs = {
  userId: string;
  targetDate: string; // YYYY-MM-DD (JST)
  now: Date;
  weekdayMinutes: number;
  weekendMinutes: number;
  isWeekend: boolean;
  isBusyMode: boolean;
  streakCount: number;
  masteryProfiles: MasteryInput[];
  recentAttempts: AttemptHistoryInput[]; // 直近 7-14 日想定
  questionPool: QuestionInput[]; // published=true のみ
};

/**
 * 1. 学習可能時間 → 目標問題数
 *  - 平日: weekday_minutes / 1.5
 *  - 休日: weekend_minutes / 1.5
 *  - 連続日数 < 3 → ×0.7(成功体験優先)
 *  - 連続日数 >= 14 → ×1.2(過負荷防止だが、慣れたユーザは伸ばす)
 *  - 繁忙期モード: 一律 5 問上限
 */
export function targetQuestionCount(input: {
  weekdayMinutes: number;
  weekendMinutes: number;
  isWeekend: boolean;
  isBusyMode: boolean;
  streakCount: number;
}): number {
  if (input.isBusyMode) return 5;
  const minutes = input.isWeekend ? input.weekendMinutes : input.weekdayMinutes;
  let n = Math.floor(minutes / AVG_MIN_PER_Q);
  if (input.streakCount < 3) n = Math.floor(n * 0.7);
  else if (input.streakCount >= 14) n = Math.floor(n * 1.2);
  return Math.max(3, Math.min(40, n));
}

/**
 * 2. 構成比決定
 *  - 全体習熟度 < 0.3 → 5:3:2(新規多め)
 *  - 全体習熟度 > 0.7 → 2:3:5(弱点多め)
 *  - 既定         → 3:5:2
 */
export function decideComposition(
  averageMasteryP: number,
): TaskCompositionRatio {
  if (averageMasteryP < 0.3) return { new: 5, review: 3, weak: 2 };
  if (averageMasteryP > 0.7) return { new: 2, review: 3, weak: 5 };
  return { new: 3, review: 5, weak: 2 };
}

/**
 * 比率と目標数から各カテゴリの実問題数を分配。端数は review に寄せる。
 */
export function allocateCounts(
  total: number,
  ratio: TaskCompositionRatio,
): TaskComposition {
  const sum = ratio.new + ratio.review + ratio.weak;
  if (sum === 0) return { new: 0, review: total, weak: 0 };
  const newN = Math.floor((total * ratio.new) / sum);
  const weakN = Math.floor((total * ratio.weak) / sum);
  const reviewN = Math.max(0, total - newN - weakN);
  return { new: newN, review: reviewN, weak: weakN };
}

/**
 * 候補抽出ロジック。純粋関数で testable。
 */
export function pickReviewCandidates(
  mastery: MasteryInput[],
  pool: QuestionInput[],
  now: Date,
): QuestionInput[] {
  const dueSubTopics = new Set(
    mastery
      .filter((m) => m.nextReviewAt !== null && m.nextReviewAt <= now)
      .map((m) => m.subTopic),
  );
  return pool.filter((q) => dueSubTopics.has(q.subTopic));
}

export function pickWeakCandidates(
  mastery: MasteryInput[],
  pool: QuestionInput[],
): QuestionInput[] {
  if (mastery.length === 0) return [];
  const sorted = [...mastery].sort((a, b) => a.masteryP - b.masteryP);
  const cutoff = Math.max(1, Math.ceil(sorted.length * 0.3));
  const weakSubTopics = new Set(sorted.slice(0, cutoff).map((m) => m.subTopic));
  return pool.filter((q) => weakSubTopics.has(q.subTopic));
}

export function pickNewCandidates(
  mastery: MasteryInput[],
  pool: QuestionInput[],
  attempted: Set<string>,
  params: BktParams = defaultBktParams,
): QuestionInput[] {
  const masteryByTopic = new Map(mastery.map((m) => [m.subTopic, m.masteryP]));
  return pool.filter((q) => {
    if (attempted.has(q.id)) return false;
    const m = masteryByTopic.get(q.subTopic) ?? params.pL0;
    // ZPD: target_difficulty = mastery_p ± 0.15
    return q.difficulty >= m - 0.15 && q.difficulty <= m + 0.15;
  });
}

/**
 * メイン: 「今日のタスク」を構築。
 */
export function buildTaskForUser(
  input: TaskGenInputs,
  params: BktParams = defaultBktParams,
): GeneratedTask {
  const {
    userId,
    targetDate,
    now,
    weekdayMinutes,
    weekendMinutes,
    isWeekend,
    isBusyMode,
    streakCount,
    masteryProfiles,
    recentAttempts,
    questionPool,
  } = input;

  // 1) 目標問題数
  const targetN = targetQuestionCount({
    weekdayMinutes,
    weekendMinutes,
    isWeekend,
    isBusyMode,
    streakCount,
  });

  // 2) 構成比
  const avgMastery =
    masteryProfiles.length === 0
      ? params.pL0
      : masteryProfiles.reduce((s, m) => s + m.masteryP, 0) /
        masteryProfiles.length;
  const ratio = decideComposition(avgMastery);
  const counts = allocateCounts(targetN, ratio);

  // 3) 24時間以内に出題した問題は除外
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentlyShown = new Set(
    recentAttempts
      .filter((a) => a.attemptedAt >= oneDayAgo)
      .map((a) => a.questionId),
  );
  const allAttempted = new Set(recentAttempts.map((a) => a.questionId));
  const pool = questionPool.filter(
    (q) => q.published && !recentlyShown.has(q.id),
  );

  // 4) 候補抽出
  const reviewPool = pickReviewCandidates(masteryProfiles, pool, now);
  const weakPool = pickWeakCandidates(masteryProfiles, pool);
  const newPool = pickNewCandidates(masteryProfiles, pool, allAttempted, params);

  // 5) 数値判定優先キュー: 過去 7 日で何問やったか確認、3 問未満なら優先枠
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const numericAttemptsThisWeek = recentAttempts.filter(
    (a) => a.isNumeric && a.attemptedAt >= sevenDaysAgo,
  ).length;
  const numericQuotaRemaining = Math.max(
    0,
    MIN_NUMERIC_PER_WEEK - numericAttemptsThisWeek,
  );

  // 6) 同 sub_topic 最大 MAX_PER_SUB_TOPIC、出題確率を考慮してスコアリング
  const subTopicCount = new Map<string, number>();
  const masteryByTopic = new Map(
    masteryProfiles.map((m) => [m.subTopic, m.masteryP]),
  );

  const picked: QuestionInput[] = [];
  const pickedIds = new Set<string>();

  function tryPick(q: QuestionInput): boolean {
    if (pickedIds.has(q.id)) return false;
    const used = subTopicCount.get(q.subTopic) ?? 0;
    if (used >= MAX_PER_SUB_TOPIC) return false;
    picked.push(q);
    pickedIds.add(q.id);
    subTopicCount.set(q.subTopic, used + 1);
    return true;
  }

  function scoreForTarget(q: QuestionInput): number {
    // BKT predictCorrect が 0.5〜0.8 になる難易度を高評価(ZPD)
    const m = masteryByTopic.get(q.subTopic) ?? params.pL0;
    const pCorrect = predictCorrect(m, params);
    // 難易度との乖離が小さいほどスコア高
    const diffGap = Math.abs(q.difficulty - m);
    return 1 - diffGap + (pCorrect >= 0.5 && pCorrect <= 0.8 ? 0.1 : 0);
  }

  function pickFrom(pool0: QuestionInput[], quota: number): number {
    const sorted = [...pool0].sort(
      (a, b) => scoreForTarget(b) - scoreForTarget(a),
    );
    let n = 0;
    for (const q of sorted) {
      if (n >= quota) break;
      if (tryPick(q)) n++;
    }
    return n;
  }

  // 6a) 数値判定優先枠を先取り(復習・弱点プールから)
  if (numericQuotaRemaining > 0) {
    const numericFirst = [...reviewPool, ...weakPool]
      .filter((q) => q.isNumeric)
      .sort((a, b) => scoreForTarget(b) - scoreForTarget(a));
    let added = 0;
    for (const q of numericFirst) {
      if (added >= numericQuotaRemaining) break;
      if (tryPick(q)) added++;
    }
  }

  // 6b) カテゴリ別に追加
  const reviewAdded = pickFrom(reviewPool, counts.review);
  const weakAdded = pickFrom(weakPool, counts.weak);
  const newAdded = pickFrom(newPool, counts.new);

  // 6c) 足りなければ全プールから補填
  if (picked.length < targetN) {
    const remaining = targetN - picked.length;
    const fallback = pool.filter((q) => !pickedIds.has(q.id));
    pickFrom(fallback, remaining);
  }

  const composition: TaskComposition = {
    new: newAdded,
    review: reviewAdded,
    weak: weakAdded,
  };

  // 7) 推定所要時間
  const estimatedMinutes = Math.round(picked.length * AVG_MIN_PER_Q);

  // 8) reason_md(テンプレ版。LLM 補完は /api/cron が後段で実施)
  const weakSubTopics = [...masteryProfiles]
    .sort((a, b) => a.masteryP - b.masteryP)
    .slice(0, 3)
    .map((m) => m.subTopic);
  const reasonMd = buildReasonMd({
    counts: composition,
    avgMastery,
    streakCount,
    numericQuotaRemaining,
    weakSubTopics,
  });

  return {
    userId,
    targetDate,
    questionIds: picked.map((q) => q.id),
    composition,
    reasonMd,
    estimatedMinutes,
  };
}

function buildReasonMd(args: {
  counts: TaskComposition;
  avgMastery: number;
  streakCount: number;
  numericQuotaRemaining: number;
  weakSubTopics: string[];
}): string {
  const lines: string[] = [];
  lines.push(
    `**今日のセット**: 新規 ${args.counts.new} 問 / 復習 ${args.counts.review} 問 / 弱点 ${args.counts.weak} 問`,
  );
  if (args.weakSubTopics.length > 0) {
    lines.push(`**重点単元**: ${args.weakSubTopics.join('、')}`);
  }
  if (args.numericQuotaRemaining > 0) {
    lines.push(
      `**数値判定優先**: 今週の数値演習が不足のため計算問題を ${args.numericQuotaRemaining} 問含めています`,
    );
  }
  if (args.streakCount >= 14) {
    lines.push(
      `**ペース**: 連続 ${args.streakCount} 日。負荷を 1.2 倍まで上げました`,
    );
  } else if (args.streakCount < 3) {
    lines.push('**ペース**: まずは終わらせる体験を優先し量を抑えています');
  }
  lines.push(`**平均習熟度**: ${(args.avgMastery * 100).toFixed(0)}%`);
  return lines.join('\n\n');
}
