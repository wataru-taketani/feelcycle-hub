"use strict";
/**
 * 日本時間(JST)専用の日時ユーティリティ (Backend)
 * Lambda環境(UTC)で正確な日本時間を扱うためのユーティリティ
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJST = getJST;
exports.getTodayJST = getTodayJST;
exports.getDateAfterDaysJST = getDateAfterDaysJST;
exports.getJSTISOString = getJSTISOString;
exports.getTTLFromJST = getTTLFromJST;
exports.isDateTodayOrFutureJST = isDateTodayOrFutureJST;
exports.logJSTInfo = logJSTInfo;
var JST_OFFSET = 9 * 60 * 60 * 1000; // JST is UTC+9
/**
 * 現在の日本時間を取得
 */
function getJST() {
    var now = new Date();
    return new Date(now.getTime() + JST_OFFSET);
}
/**
 * 日本時間の今日の日付を YYYY-MM-DD 形式で取得
 */
function getTodayJST() {
    return getJST().toISOString().split('T')[0];
}
/**
 * 日本時間で指定日数後の日付を YYYY-MM-DD 形式で取得
 */
function getDateAfterDaysJST(days) {
    var jst = getJST();
    var futureDate = new Date(jst.getTime() + days * 24 * 60 * 60 * 1000);
    return futureDate.toISOString().split('T')[0];
}
/**
 * 現在の日本時間を ISO 文字列で取得 (タイムスタンプ用)
 */
function getJSTISOString() {
    return getJST().toISOString();
}
/**
 * TTL用のUnixタイムスタンプを生成 (日本時間基準)
 * @param daysFromNow 何日後のTTLにするか
 */
function getTTLFromJST(daysFromNow) {
    return Math.floor((getJST().getTime() + daysFromNow * 24 * 60 * 60 * 1000) / 1000);
}
/**
 * 日付文字列がJST基準で今日以降かチェック
 */
function isDateTodayOrFutureJST(dateString) {
    var todayJST = getTodayJST();
    return dateString >= todayJST;
}
/**
 * 現在のJST時刻情報をログ出力 (デバッグ用)
 */
function logJSTInfo(label) {
    if (label === void 0) { label = 'JST Info'; }
    var jst = getJST();
    var utc = new Date();
    console.log("=== ".concat(label, " ==="));
    console.log("UTC: ".concat(utc.toISOString()));
    console.log("JST: ".concat(jst.toISOString()));
    console.log("Today JST: ".concat(getTodayJST()));
    console.log("JST Local String: ".concat(jst.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })));
}
