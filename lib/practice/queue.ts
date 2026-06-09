// 演習プリフェッチキュー(sessionStorage)の共通モジュール
// 模試完了・オンボーディング完了など、 出題ロジックが大きく変わるイベント後に
// キューをクリアして、 古いロジックで取った問題を破棄する。

export const QUEUE_KEY = 'jigen_question_queue_v1';

export function clearPracticeQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(QUEUE_KEY);
  } catch {
    /* sessionStorage 使用不可ブラウザは無視 */
  }
}
