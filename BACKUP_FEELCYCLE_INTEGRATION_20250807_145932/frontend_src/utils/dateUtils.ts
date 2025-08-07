/**
 * 日本時間(JST)専用の日時ユーティリティ
 * プロジェクト全体で一貫した日時管理を行う
 */

const JST_OFFSET = 9 * 60 * 60 * 1000; // JST is UTC+9

/**
 * 現在の日本時間を取得
 */
export function getJST(): Date {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + JST_OFFSET);
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
 * 日付文字列を日本時間で解釈してフォーマット
 */
export function formatDateJST(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00+09:00'); // JST指定
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
}

/**
 * 現在の日本時間を ISO 文字列で取得 (タイムスタンプ用)
 */
export function getJSTISOString(): string {
  return getJST().toISOString();
}

/**
 * デバッグ用: 各種時間情報を表示
 */
export function debugTimeInfo(): void {
  console.log('=== 日時情報デバッグ ===');
  console.log('Local Time:', new Date().toString());
  console.log('JST Time:', getJST().toString());
  console.log('Today JST:', getTodayJST());
  console.log('UTC:', new Date().toISOString());
  console.log('JST ISO:', getJSTISOString());
}