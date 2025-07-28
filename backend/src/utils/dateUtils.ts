/**
 * 日本時間(JST)専用の日時ユーティリティ (Backend)
 * Lambda環境(UTC)で正確な日本時間を扱うためのユーティリティ
 */

const JST_OFFSET = 9 * 60 * 60 * 1000; // JST is UTC+9

/**
 * 現在の日本時間を取得
 */
export function getJST(): Date {
  const now = new Date();
  return new Date(now.getTime() + JST_OFFSET);
}

/**
 * 日本時間の今日の日付を YYYY-MM-DD 形式で取得
 */
export function getTodayJST(): string {
  return getJST().toISOString().split('T')[0];
}

/**
 * 日本時間で指定日数後の日付を YYYY-MM-DD 形式で取得
 */
export function getDateAfterDaysJST(days: number): string {
  const jst = getJST();
  const futureDate = new Date(jst.getTime() + days * 24 * 60 * 60 * 1000);
  return futureDate.toISOString().split('T')[0];
}

/**
 * 現在の日本時間を ISO 文字列で取得 (タイムスタンプ用)
 */
export function getJSTISOString(): string {
  return getJST().toISOString();
}

/**
 * TTL用のUnixタイムスタンプを生成 (日本時間基準)
 * @param daysFromNow 何日後のTTLにするか
 */
export function getTTLFromJST(daysFromNow: number): number {
  return Math.floor((getJST().getTime() + daysFromNow * 24 * 60 * 60 * 1000) / 1000);
}

/**
 * 日付文字列がJST基準で今日以降かチェック
 */
export function isDateTodayOrFutureJST(dateString: string): boolean {
  const todayJST = getTodayJST();
  return dateString >= todayJST;
}

/**
 * 現在のJST時刻情報をログ出力 (デバッグ用)
 */
export function logJSTInfo(label: string = 'JST Info'): void {
  const jst = getJST();
  const utc = new Date();
  
  console.log(`=== ${label} ===`);
  console.log(`UTC: ${utc.toISOString()}`);
  console.log(`JST: ${jst.toISOString()}`);
  console.log(`Today JST: ${getTodayJST()}`);
  console.log(`JST Local String: ${jst.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
}