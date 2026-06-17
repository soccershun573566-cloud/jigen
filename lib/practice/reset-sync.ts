/**
 * リセット時にクリアすべきクライアント状態を一掃するヘルパー。
 *
 * ホーム / 演習画面 どちらからリセットを押しても、
 * 「進捗カウンタ・経過時間・キュー・中断状態」 を統一して 0 に戻す。
 *
 * 注意: attempts や mastery_profiles など サーバの永続データは触らない。
 * サーバ側は users.daily_reset_at を立てるだけ。
 */
export function clearAllPracticeClientState(): void {
  if (typeof window === 'undefined') return;
  try {
    // 中断時の todaySolved スナップショット
    localStorage.removeItem('jigen_today_solved_snapshot_v1');
    // 経過時間ストップウォッチの累積秒
    const today = (() => {
      const d = new Date();
      const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
      return new Date(jstMs).toISOString().slice(0, 10);
    })();
    localStorage.removeItem(`jigen_session_state_v2_${today}`);
    // 中断時の再開対象問題
    localStorage.removeItem('jigen_practice_resume_v1');
  } catch { /* QuotaExceeded等は無視 */ }
  try {
    // 演習キュー(古い出題ロジックで取った問題を破棄)
    sessionStorage.removeItem('jigen_question_queue_v1');
  } catch { /* */ }
}
