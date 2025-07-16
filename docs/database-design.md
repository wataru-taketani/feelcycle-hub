# FEELCYCLE Hub - データベース設計書

## DynamoDB テーブル設計

FEELCYCLE HubではDynamoDBを採用し、Single Table Designパターンを基本としつつ、機能ごとにテーブルを分割して管理します。

## 1. Users テーブル

ユーザーの基本情報とLINE連携情報を管理

### テーブル構成
- **テーブル名**: `feelcycle-hub-users-{environment}`
- **パーティションキー**: `PK` (String)
- **ソートキー**: `SK` (String)
- **Billing Mode**: On-Demand
- **Encryption**: AWS Managed

### データ構造

#### ユーザープロファイル
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "PROFILE",
  "GSI1PK": "EMAIL#user@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "planType": "monthly15",
  "isActive": true,
  "createdAt": "2025-07-16T10:00:00Z",
  "updatedAt": "2025-07-16T10:00:00Z",
  "settings": {
    "enableNotifications": true,
    "autoReserve": false,
    "preferredStudios": ["表参道", "銀座"],
    "notificationTime": "30" // minutes before lesson
  }
}
```

#### LINE連携情報
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "LINE",
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "accessToken": "encrypted_access_token",
  "refreshToken": "encrypted_refresh_token",
  "connectedAt": "2025-07-16T10:00:00Z",
  "lastActiveAt": "2025-07-16T12:00:00Z"
}
```

### インデックス設計

#### GSI1: EmailIndex
- **パーティションキー**: `GSI1PK` (EMAIL#email)
- **ソートキー**: `SK`
- **用途**: メールアドレスによるユーザー検索

#### GSI2: LineUserIndex  
- **パーティションキー**: `GSI2PK` (LINE#lineUserId)
- **ソートキー**: `SK`
- **用途**: LINE UserIDによるユーザー検索

## 2. Reservations テーブル

予約状況と監視設定を管理

### テーブル構成
- **テーブル名**: `feelcycle-hub-reservations-{environment}`
- **パーティションキー**: `PK` (String)
- **ソートキー**: `SK` (String)
- **TTL属性**: `ttl` (Number)
- **Billing Mode**: On-Demand

### データ構造

#### 監視設定
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "WATCH#2025-07-20#表参道#10:30#YUKI",
  "GSI1PK": "DATE#2025-07-20",
  "GSI1SK": "STUDIO#表参道#TIME#10:30",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "lessonId": "lesson_123456",
  "studio": "表参道",
  "date": "2025-07-20",
  "time": "10:30",
  "instructor": "YUKI",
  "program": "BB1",
  "status": "watching",
  "autoReserve": true,
  "createdAt": "2025-07-16T10:00:00Z",
  "lastCheckedAt": "2025-07-16T12:00:00Z",
  "notificationCount": 0,
  "ttl": 1721491200 // 5 minutes after lesson time
}
```

#### 予約履歴
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "RESERVATION#2025-07-20#lesson_123456",
  "lessonId": "lesson_123456",
  "studio": "表参道",
  "date": "2025-07-20",
  "time": "10:30",
  "instructor": "YUKI",
  "program": "BB1",
  "status": "reserved",
  "reservedAt": "2025-07-16T10:30:00Z",
  "reservationMethod": "auto", // auto | manual
  "attendanceStatus": null, // attended | no-show | cancelled
  "ttl": 1722009600 // 7 days after lesson
}
```

### インデックス設計

#### GSI1: DateStudioIndex
- **パーティションキー**: `GSI1PK` (DATE#date)
- **ソートキー**: `GSI1SK` (STUDIO#studio#TIME#time)
- **用途**: 日付・スタジオ別の監視枠検索

#### GSI2: StatusIndex
- **パーティションキー**: `GSI2PK` (STATUS#status)
- **ソートキー**: `SK`
- **用途**: ステータス別の監視枠検索

## 3. LessonHistory テーブル

受講履歴と統計データを管理

### テーブル構成
- **テーブル名**: `feelcycle-hub-lesson-history-{environment}`
- **パーティションキー**: `PK` (String)
- **ソートキー**: `SK` (String)
- **Billing Mode**: On-Demand

### データ構造

#### 受講履歴
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "HISTORY#2025-07-16T10:30:00Z",
  "GSI1PK": "DATE#2025-07-16",
  "GSI1SK": "STUDIO#表参道",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "lessonId": "lesson_123456",
  "date": "2025-07-16",
  "time": "10:30",
  "studio": "表参道",
  "instructor": "YUKI",
  "program": "BB1",
  "attendanceStatus": "attended",
  "reservationMethod": "auto",
  "completedAt": "2025-07-16T11:30:00Z",
  "rating": 5, // 1-5 stars (optional)
  "notes": "Great workout!" // optional
}
```

#### 月次統計（事前計算）
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "STATS#2025-07",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "month": "2025-07",
  "totalLessons": 12,
  "totalMinutes": 540, // 45 min * 12 lessons
  "studioBreakdown": {
    "表参道": 8,
    "銀座": 4
  },
  "instructorBreakdown": {
    "YUKI": 5,
    "MIKI": 4,
    "NANA": 3
  },
  "programBreakdown": {
    "BB1": 6,
    "BSL": 4,
    "BSB": 2
  },
  "updatedAt": "2025-07-31T23:59:59Z"
}
```

### インデックス設計

#### GSI1: DateIndex
- **パーティションキー**: `GSI1PK` (DATE#date)
- **ソートキー**: `GSI1SK` (STUDIO#studio)
- **用途**: 日付別の受講履歴検索

#### GSI2: InstructorIndex
- **パーティションキー**: `GSI2PK` (INSTRUCTOR#instructor)
- **ソートキー**: `SK`
- **用途**: インストラクター別の受講履歴検索

## アクセスパターン

### 1. ユーザー関連
- ユーザー情報取得: `PK = USER#{userId}`, `SK = PROFILE`
- メール検索: `GSI1PK = EMAIL#{email}`
- LINE連携検索: `GSI2PK = LINE#{lineUserId}`

### 2. 監視・予約関連
- ユーザーの監視枠一覧: `PK = USER#{userId}`, `SK begins_with WATCH#`
- 日付別監視枠: `GSI1PK = DATE#{date}`
- アクティブ監視枠: `GSI2PK = STATUS#watching`

### 3. 履歴・統計関連
- ユーザー履歴: `PK = USER#{userId}`, `SK begins_with HISTORY#`
- 日付範囲履歴: `GSI1PK = DATE#{date}`, フィルター
- 月次統計: `PK = USER#{userId}`, `SK = STATS#{month}`

## パフォーマンス最適化

### 1. ホットパーティション対策
- ユーザーIDベースの分散でホットパーティション回避
- 日付ベースのGSIで時系列クエリ最適化

### 2. クエリ最適化
- 複合ソートキーによる効率的フィルタリング
- 事前計算済み統計データの活用
- TTLによる不要データの自動削除

### 3. コスト最適化
- On-Demandモードで使用量ベース課金
- TTL設定による自動データ削除
- 必要最小限のGSI設計

## データ整合性

### 1. トランザクション
- DynamoDB Transactionsで重要操作の原子性保証
- 監視設定と予約履歴の同期

### 2. 冪等性
- リクエストIDによる重複処理防止
- ステータス管理による状態整合性

### 3. データ検証
- Lambda関数でのスキーマ検証
- 型安全なTypeScript定義

## バックアップ・復旧

### 1. バックアップ戦略
- 本番環境: Point-in-Time Recovery有効
- 開発環境: 手動バックアップ
- クロスリージョンバックアップ（将来検討）

### 2. 復旧手順
- PITR利用の過去時点復旧
- Export/Import機能による移行
- CloudFormationによる環境復旧

## セキュリティ

### 1. アクセス制御
- IAMロールによる最小権限アクセス
- VPCエンドポイント経由アクセス（将来検討）

### 2. 暗号化
- AWS Managed Keysによる保存時暗号化
- 機密データはSecrets Managerに分離保存

### 3. 監査
- CloudTrailによるアクセスログ
- DynamoDB Streamsによる変更追跡（必要に応じて）