/**
 * 動的難易度調整
 * タクト§5.4 / 技術構築計画§4.2
 *
 * 直近 10 問の正答率を見て、次回のターゲット難易度(0..1)を更新する。
 *  - 70% 超 → +0.1(物足りない / 退屈 → 上げる)
 *  - 40% 未満 → -0.1(フラスト / 離脱予兆 → 下げる)
 *  - 40〜70% → 維持
 *
 * ターゲット難易度は BKT の mastery_p からの ±0.15 レンジ(ZPD: 近接発達領域)を
 * シフトさせるベース値として task-generator が利用する。
 */

const HIGH = 0.7;
const LOW = 0.4;
const STEP = 0.1;
const MIN = 0.1;
const MAX = 0.9;

export type AttemptOutcome = {
  isCorrect: boolean;
  attemptedAt: Date;
};

/**
 * 直近 attempts(新しい順でも古い順でも可)から正答率を算出。
 * 最新 limit 件まで。
 */
export function recentCorrectRate(
  attempts: AttemptOutcome[],
  limit = 10,
): number {
  if (attempts.length === 0) return 0;
  const sorted = [...attempts].sort(
    (a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime(),
  );
  const slice = sorted.slice(0, limit);
  const correct = slice.filter((a) => a.isCorrect).length;
  return correct / slice.length;
}

/**
 * 現在のターゲット難易度に対し、直近 attempts に応じて次回難易度を返す純粋関数。
 *
 * @param current 現在のターゲット難易度 [0, 1]
 * @param attempts 直近 attempts(任意の順序)
 * @param limit 観測ウィンドウ(デフォルト 10)
 */
export function nextTargetDifficulty(
  current: number,
  attempts: AttemptOutcome[],
  limit = 10,
): number {
  // 観測サンプル数が足りないと判断ノイズが大きい → 5件未満なら維持
  if (attempts.length < 5) return clamp(current);
  const rate = recentCorrectRate(attempts, limit);
  let delta = 0;
  if (rate > HIGH) delta = STEP;
  else if (rate < LOW) delta = -STEP;
  return clamp(current + delta);
}

/**
 * mastery_p からデフォルトのターゲット難易度を算出。
 * 既存 attempts が無い新規ユーザー向け。
 */
export function targetDifficultyFromMastery(masteryP: number): number {
  return clamp(masteryP);
}

/**
 * 互換: 旧シグネチャ(直近正答率 → 推奨ターゲット)。
 * 既存スケルトンが参照しているため残置。新規呼び出しは nextTargetDifficulty を使う。
 */
export function targetDifficulty(recentCorrectRateValue: number): number {
  if (recentCorrectRateValue > HIGH) return clamp(0.5 + STEP);
  if (recentCorrectRateValue < LOW) return clamp(0.5 - STEP);
  return 0.5;
}

function clamp(x: number): number {
  if (Number.isNaN(x)) return 0.5;
  return Math.min(MAX, Math.max(MIN, x));
}
