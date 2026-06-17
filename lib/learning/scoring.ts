/**
 * 採点共通ヘルパー
 *
 * raw SQL (`db.execute(sql\`...\`)`) で取得した questions.answer は jsonb 列だが
 * postgres-js は文字列のまま返してしまう。 そのまま `Number(answerStr)` すると NaN になり
 * **全問不正解** になるバグがあった。
 * このヘルパーは answer フィールドを安全に数値1選択肢インデックスへ正規化する。
 */
export function parseAnswerToValue(answerField: unknown): number | null {
  let v: unknown = answerField;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { /* keep as is */ }
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v && typeof v === 'object' && 'value' in v) {
    const inner = (v as { value: unknown }).value;
    const n = typeof inner === 'number' ? inner : Number(inner);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
