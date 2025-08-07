/**
 * dateUtils.ts のユニットテスト
 * Mock不要の純粋関数テスト
 */

import {
  getJST,
  getTodayJST,
  getDateAfterDaysJST,
  formatDateJST,
  getJSTISOString
} from '@/utils/dateUtils';

describe('dateUtils', () => {
  describe('getJST', () => {
    it('日本時間のDateオブジェクトを返す', () => {
      const jst = getJST();
      expect(jst).toBeInstanceOf(Date);
      expect(jst.getTime()).toBeGreaterThan(0);
    });
    
    it('現在時刻に基づいて動作する', () => {
      const before = Date.now();
      const jst = getJST();
      const after = Date.now();
      
      // JST時間が現在時刻の範囲内にある（±1時間のマージン）
      const jstTime = jst.getTime();
      const hourInMs = 60 * 60 * 1000;
      expect(jstTime).toBeGreaterThan(before - hourInMs);
      expect(jstTime).toBeLessThan(after + hourInMs);
    });
  });

  describe('getTodayJST', () => {
    it('YYYY-MM-DD形式の文字列を返す', () => {
      const today = getTodayJST();
      expect(typeof today).toBe('string');
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    it('有効な日付文字列である', () => {
      const today = getTodayJST();
      const date = new Date(today);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('getDateAfterDaysJST', () => {
    it('指定日数後の日付を正しく計算する', () => {
      const today = getTodayJST();
      const tomorrow = getDateAfterDaysJST(1);
      const yesterday = getDateAfterDaysJST(-1);
      
      expect(typeof tomorrow).toBe('string');
      expect(typeof yesterday).toBe('string');
      expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // 日付の大小関係チェック（時刻を比較）
      expect(new Date(yesterday).getTime()).toBeLessThan(new Date(today).getTime());
      expect(new Date(today).getTime()).toBeLessThan(new Date(tomorrow).getTime());
    });
    
    it('0日後は今日と同じ', () => {
      const today = getTodayJST();
      const sameDay = getDateAfterDaysJST(0);
      expect(sameDay).toBe(today);
    });
  });

  describe('formatDateJST', () => {
    it('正しい形式でフォーマットする', () => {
      const formatted = formatDateJST('2024-12-25');
      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/^\d{1,2}\/\d{1,2}\([日月火水木金土]\)$/);
    });
    
    it('既知の日付を正しくフォーマットする', () => {
      // 2024-01-01は月曜日
      const formatted = formatDateJST('2024-01-01');
      expect(formatted).toBe('1/1(月)');
    });
    
    it('うるう年の日付も処理できる', () => {
      const formatted = formatDateJST('2024-02-29');
      expect(formatted).toMatch(/^2\/29\([日月火水木金土]\)$/);
    });
  });

  describe('getJSTISOString', () => {
    it('ISO形式の文字列を返す', () => {
      const isoString = getJSTISOString();
      expect(typeof isoString).toBe('string');
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
    
    it('有効なISO文字列である', () => {
      const isoString = getJSTISOString();
      const date = new Date(isoString);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('日時の一貫性テスト', () => {
    it('getTodayJSTとgetJSTが同じ日付を返す', () => {
      const todayString = getTodayJST();
      const jstDate = getJST();
      const jstDateString = jstDate.toISOString().split('T')[0];
      
      expect(todayString).toBe(jstDateString);
    });
    
    it('getJSTISOStringとgetJSTが同じ時刻を返す', () => {
      const isoString = getJSTISOString();
      const jstDate = getJST();
      
      // ミリ秒の差を許容（実行タイミングの差）
      const timeDiff = Math.abs(new Date(isoString).getTime() - jstDate.getTime());
      expect(timeDiff).toBeLessThan(1000); // 1秒未満の差
    });
  });
});