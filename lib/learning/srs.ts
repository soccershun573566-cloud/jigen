/**
 * SRS(Spaced Repetition System): SM-2 簡略版
 * タクト§5 / 技術構築計画§4.2
 *
 * quality:
 *   0 = 完全誤答(白紙・全くの的外れ)
 *   1 = 誤答だが選択肢迷い有り
 *   2 = 誤答(惜しい — 数値判定で許容外だが近い)
 *   3 = 正答(辛勝)
 *   4 = 正答(余裕)
 *   5 = 満点(数値判定でも誤差ゼロ等)
 *
 * 数値判定問題の near_miss(惜しい誤答)は通常誤答より復習を遅らせる:
 *   - 完全誤答 → 1日後
 *   - near_miss → 1〜3日後(quality=2 相当、tolerance との比で動的に)
 *   - 正答     → SM-2 式に従って延伸
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 次回復習までの日数(整数 ≧ 1)を返す純粋関数。
 *
 * @param prevDays 前回の interval(日)。初回なら 0
 * @param quality SM-2 quality 0..5
 */
export function nextInterval(prevDays: number, quality: number): number {
  const q = clampQuality(quality);
  if (q < 3) return 1;
  // SM-2 EF 更新式(EF は本来永続化するが、MVP では quality だけから簡易算出)
  const ef = Math.max(1.3, 2.5 + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return Math.max(1, Math.round(prevDays === 0 ? 1 : prevDays * ef));
}

/**
 * 数値判定問題専用の next_review_at 計算。
 * 完全誤答 → 1日後。near_miss(惜しい)→ 24〜72時間後にスケール。
 * 正答は通常の SM-2 経路に委譲(quality を投げてもらう)。
 *
 * @param now 基準時刻
 * @param outcome 'correct' | 'near_miss' | 'miss'
 * @param prevDays 前回 interval
 * @param toleranceRatio near_miss 時のみ参照(誤差 / 許容値の比、0..1+)
 */
export function nextReviewForNumeric(
  now: Date,
  outcome: 'correct' | 'near_miss' | 'miss',
  prevDays = 0,
  toleranceRatio = 1,
): Date {
  if (outcome === 'correct') {
    return nextReviewAt(now, prevDays, 4);
  }
  if (outcome === 'miss') {
    return new Date(now.getTime() + DAY_MS);
  }
  // near_miss: 24h〜72h、誤差比が小さいほど復習を遅らせる(惜しいので少し置いて)
  const ratio = clamp01(toleranceRatio);
  const hours = 24 + Math.round(48 * (1 - ratio));
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/**
 * 標準 SM-2 ルートでの次回復習日時。
 */
export function nextReviewAt(now: Date, prevDays: number, quality: number): Date {
  const days = nextInterval(prevDays, quality);
  return new Date(now.getTime() + days * DAY_MS);
}

/**
 * Date 専用ヘルパ(日付のみ、JST 想定で呼び出し側で正規化済み前提)。
 */
export function nextReviewDate(now: Date, intervalDays: number): Date {
  const d = Math.max(0, Math.round(intervalDays));
  return new Date(now.getTime() + d * DAY_MS);
}

/**
 * Attempt 結果(isCorrect + isNearMiss + isNumeric)から quality を導出。
 * BKT 更新と SRS quality を同時に決めるため Attempts API から使う。
 */
export function deriveQuality(args: {
  isCorrect: boolean;
  isNearMiss: boolean;
  isNumeric: boolean;
  responseSeconds: number;
}): number {
  const { isCorrect, isNearMiss, isNumeric, responseSeconds } = args;
  if (isCorrect) {
    // 速ければ 5、迷ったら 3
    if (responseSeconds <= 30) return 5;
    if (responseSeconds <= 90) return 4;
    return 3;
  }
  if (isNumeric && isNearMiss) return 2;
  return 0;
}

function clampQuality(q: number): number {
  if (Number.isNaN(q)) return 0;
  if (q < 0) return 0;
  if (q > 5) return 5;
  return Math.round(q);
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
