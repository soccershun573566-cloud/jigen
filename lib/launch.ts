// 試験直前ver ローンチ時刻管理
// 6/18 23:55: VIP優先購入開始(LINE「購入希望」 タグの人へ配信されたURL付き)
// 6/19 00:00: 一般販売開始
// 7/05 23:59: 販売終了(締切時点で試験まで残り3週間 = 6/28 → ※ 詳細は別管理)

export const LAUNCH_GENERAL_START_ISO = '2026-06-19T00:00:00+09:00';
export const LAUNCH_VIP_START_ISO = '2026-06-18T23:55:00+09:00';

// VIPコード(LINE登録者の「購入希望」 タグユーザーに 23:55 配信される URL の vip パラメータ)
// 環境変数で上書き可能。 デフォルトは「jigen-earlybird-2026」
export function getVipCode(): string {
  return process.env.LAUNCH_VIP_CODE ?? 'jigen-earlybird-2026';
}

export type LaunchPhase =
  | 'before-vip'    // 6/18 23:55 より前: 全員アクセス不可、 大カウントダウン
  | 'vip-only-blocked'  // VIP優先期間中だが VIPコード持ってない: 「あと5分」 表示
  | 'vip-only-ok'   // VIP優先期間中で VIPコード一致: 購入可能
  | 'open';         // 6/19 00:00 以降: 全員購入可能

/**
 * 現在のローンチフェーズを判定
 * @param vipCode URL クエリで渡された vipコード(なければ空文字)
 */
export function getLaunchPhase(vipCode?: string): LaunchPhase {
  const now = Date.now();
  const vipStart = new Date(LAUNCH_VIP_START_ISO).getTime();
  const openStart = new Date(LAUNCH_GENERAL_START_ISO).getTime();

  if (now >= openStart) return 'open';
  if (now >= vipStart) {
    return vipCode && vipCode === getVipCode() ? 'vip-only-ok' : 'vip-only-blocked';
  }
  return 'before-vip';
}

/** 一般販売開始までのミリ秒(マイナス値なら既に開始済) */
export function msUntilGeneralStart(): number {
  return new Date(LAUNCH_GENERAL_START_ISO).getTime() - Date.now();
}

/** VIP販売開始までのミリ秒 */
export function msUntilVipStart(): number {
  return new Date(LAUNCH_VIP_START_ISO).getTime() - Date.now();
}

/** ボタンが押せるかどうか */
export function canPurchase(vipCode?: string): boolean {
  const phase = getLaunchPhase(vipCode);
  return phase === 'open' || phase === 'vip-only-ok';
}
