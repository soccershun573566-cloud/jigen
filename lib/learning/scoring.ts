/**
 * 採点共通ヘルパー
 *
 * raw SQL (`db.execute(sql\`...\`)`) で取得した questions.answer は jsonb 列だが
 * postgres-js は文字列のまま返してしまう。 そのまま `Number(answerStr)` すると NaN になり
 * **全問不正解** になるバグがあった。
 * このヘルパーは answer フィールドを安全に正規化する。
 *
 * 一般問題(四肢択一):     answer = {"value": 3} or 3
 * 応用問題(五肢二択):     answer = [2, 5](2つの選択肢番号)
 */
function parseJsonbValue(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export function parseAnswerToValue(answerField: unknown): number | null {
  const v = parseJsonbValue(answerField);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) {
    const inner = (v as { value: unknown }).value;
    const n = typeof inner === 'number' ? inner : Number(inner);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 応用問題(五肢二択) の正答配列を取得。
 * answer が配列でない場合は null を返す(=応用問題ではない)。
 */
export function parseAnswerToArray(answerField: unknown): number[] | null {
  const v = parseJsonbValue(answerField);
  if (!Array.isArray(v)) return null;
  const nums = v.map((x) => (typeof x === 'number' ? x : Number(x))).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return nums;
}

/**
 * 採点判定: ユーザー回答と正答が一致するか。
 * 一般問題(number)・応用問題(number[]) 両対応。
 */
export function isAnswerCorrect(userAnswer: unknown, correctAnswer: unknown): boolean {
  const correctArr = parseAnswerToArray(correctAnswer);
  // 応用問題: 配列同士で順不同比較
  if (correctArr) {
    if (!Array.isArray(userAnswer)) return false;
    const userNums = (userAnswer as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (userNums.length !== correctArr.length) return false;
    const c = [...correctArr].sort((a, b) => a - b);
    const u = [...userNums].sort((a, b) => a - b);
    return c.every((v, i) => v === u[i]);
  }
  // 一般問題: 単一値比較
  const correctVal = parseAnswerToValue(correctAnswer);
  if (correctVal === null) return false;
  const userVal = typeof userAnswer === 'number' ? userAnswer : Number(userAnswer);
  return Number.isFinite(userVal) && correctVal === userVal;
}
