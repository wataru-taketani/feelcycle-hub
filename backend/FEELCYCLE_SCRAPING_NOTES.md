# FEELCYCLE スクレイピング 重要メモ

## サイト構造の理解

### 基本的な流れ
1. **スタジオ選択のみ** - 日付選択は不要
2. **スタジオ選択後** - そのスタジオの全日程が表示される
3. **日付は横並び** - 左から右へ時系列順

### HTML構造の詳細

#### 日付ヘッダー
```html
<div class="header-sc-list">
  <div class="content"><div class="days">7/18(金)</div></div>  <!-- 実行日（最初） -->
  <div class="content"><div class="days">7/19(土)</div></div>  <!-- 2日目 -->
  <div class="content"><div class="days">7/20(日)</div></div>  <!-- 3日目 -->
  <div class="content"><div class="days">7/21(月)</div></div>  <!-- 4日目 -->
  <div class="content"><div class="days">7/22(火)</div></div>  <!-- 5日目 -->
  <div class="content"><div class="days">7/23(水)</div></div>  <!-- 6日目 -->
  <div class="content"><div class="days">7/24(木)</div></div>  <!-- 7日目 (index=6) -->
  <!-- 以下続く -->
</div>
```

#### レッスン一覧の構造
```html
<div class="sc_list active">
  <!-- 当日のレッスン（実行日） -->
  <div class="content today">
    <div class="content_inner">
      <div class="lesson overflow_hidden seat-available">
        <div class="time">18:00 - 18:45</div>
        <div class="lesson_name">BB2 ARGD</div>
        <div class="instructor">T.Natsumi</div>
        <div class="status">...</div>
      </div>
      <!-- 他のレッスン -->
    </div>
  </div>
  
  <!-- 2日目のレッスン -->
  <div class="content">
    <div class="content_inner">
      <!-- レッスン群 -->
    </div>
  </div>
  
  <!-- 3日目のレッスン -->
  <div class="content">
    <div class="content_inner">
      <!-- レッスン群 -->
    </div>
  </div>
  
  <!-- ... 7日目（7/24）のレッスン -->
  <div class="content">
    <div class="content_inner">
      <div class="lesson overflow_hidden seat-available">
        <div class="time">07:00 - 07:45</div>
        <div class="lesson_name">BB2 NOW 1</div>
        <div class="instructor">Fuka</div>
        <div class="status">...</div>
      </div>
      <!-- 他のレッスン -->
    </div>
  </div>
</div>
```

## 重要なポイント

### 1. 日付の取得
- **実行日が最初**: 7/18が0番目
- **7/24の位置**: 6番目（0-indexed）
- **日付の確認**: `.header-sc-list .content .days`で取得

### 2. レッスンの取得
- **全レッスン**: `.lesson.overflow_hidden`で取得可能
- **日付別**: `.sc_list.active > .content`の順序で対応
- **当日の特別クラス**: `.content.today`
- **他の日**: 通常の`.content`

### 3. レッスンデータの構造
- **時間**: `.time`
- **レッスン名**: `.lesson_name`
- **講師**: `.instructor`
- **予約状況**: `.status`
- **空席状況**: `seat-available`クラスで判定

## スクレイピングの正しい手順

1. **サイトアクセス**: `https://m.feelcycle.com/reserve`
2. **スタジオ選択**: 新宿(SJK)をクリック
3. **待機**: レッスン一覧の読み込み完了まで待つ
4. **日付確認**: `.header-sc-list .content .days`で日付配列を取得
5. **対象日特定**: 7/24の位置を特定（通常6番目）
6. **レッスン取得**: `.sc_list.active > .content:nth-child(7)`からレッスンを取得

## 実際のデータ例（7/24）
- **07:00-07:45**: BB2 NOW 1 (Fuka)
- **08:00-08:45**: BB1 BRIT 2024 (Fuka)
- **10:30-11:15**: BB2 10s 3 (Sumiki)
- など

## 注意点
- **動的生成**: `data-v-*`属性は動的に生成される
- **セレクタ**: 汎用的なクラス名を使用
- **待機時間**: レッスン一覧の完全読み込みを待つ
- **日付の位置**: 実行日によって変わる可能性

## 過去の間違い
- ❌ 日付選択処理を追加した
- ❌ 3ステップ処理と誤解した
- ❌ 全レッスンから日付を特定せず使用した

## 正しい実装
- ✅ スタジオ選択のみ
- ✅ 日付位置の特定
- ✅ 対象日のレッスンのみ取得