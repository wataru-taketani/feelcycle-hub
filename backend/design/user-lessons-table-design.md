# user_lessons テーブル設計

## 目的
- 気になるリスト（お気に入り）
- キャンセル待ち登録
- 予約履歴
- その他ユーザーとレッスンの関連情報を統一管理

## テーブル設計

### Primary Key構造
- **PK**: `USER#{userId}`
- **SK**: `LESSON#{studioCode}#{lessonDate}#{startTime}#{type}`

### 属性
```typescript
interface UserLessonRecord {
  // Primary Keys
  PK: string;                    // USER#{userId}
  SK: string;                    // LESSON#{studioCode}#{lessonDate}#{startTime}#{type}
  
  // Basic Info
  userId: string;                // ユーザーID
  studioCode: string;            // スタジオコード (gnz, sby, etc.)
  lessonDate: string;            // レッスン日 (YYYY-MM-DD)
  startTime: string;             // 開始時間 (HH:MM)
  lessonName: string;            // レッスン名
  instructor: string;            // インストラクター名
  
  // Type & Status
  type: 'favorite' | 'waitlist' | 'booking' | 'history';  // 関係タイプ
  status: 'active' | 'completed' | 'cancelled' | 'expired'; // ステータス
  
  // Metadata
  createdAt: string;             // 登録日時 (ISO string)
  updatedAt: string;             // 更新日時 (ISO string)
  ttl?: number;                  // 自動削除用 (optional)
  
  // Type-specific data
  waitlistId?: string;           // キャンセル待ちID (waitlist用)
  notificationSent?: boolean;    // 通知送信済み (waitlist用)
  reservationId?: string;        // 予約ID (booking/history用)
  notes?: string;                // メモ (favorite用)
}
```

### GSI設計

#### GSI1: TypeDateIndex
- **PK**: `type`
- **SK**: `lessonDate`
- **用途**: タイプ別の日付ソート、一括処理

#### GSI2: StudioDateIndex  
- **PK**: `studioCode`
- **SK**: `lessonDate`
- **用途**: スタジオ別のレッスン取得

#### GSI3: StatusDateTimeIndex
- **PK**: `status`
- **SK**: `lessonDateTime` (computed: lessonDate + startTime)
- **用途**: ステータス別の時系列処理、監視対象抽出

## データ例

### 気になるリスト
```json
{
  "PK": "USER#user123",
  "SK": "LESSON#gnz#2025-07-30#10:30#favorite",
  "userId": "user123",
  "studioCode": "gnz",
  "lessonDate": "2025-07-30",
  "startTime": "10:30",
  "lessonName": "BSL House 1",
  "instructor": "YUKI",
  "type": "favorite",
  "status": "active",
  "createdAt": "2025-07-29T03:45:00.000Z",
  "updatedAt": "2025-07-29T03:45:00.000Z",
  "notes": "いつものお気に入り"
}
```

### キャンセル待ち
```json
{
  "PK": "USER#user123", 
  "SK": "LESSON#gnz#2025-07-30#19:30#waitlist",
  "userId": "user123",
  "studioCode": "gnz",
  "lessonDate": "2025-07-30",
  "startTime": "19:30",
  "lessonName": "BSL House 1",
  "instructor": "Shiori.I",
  "type": "waitlist",
  "status": "active",
  "createdAt": "2025-07-29T03:45:00.000Z",
  "updatedAt": "2025-07-29T03:45:00.000Z",
  "waitlistId": "wl_abc123",
  "notificationSent": false,
  "ttl": 1722319500
}
```

## 移行方針
1. 既存の`waitlistTable`データを新テーブルに移行
2. 新機能（気になるリスト）を追加実装
3. 段階的に既存テーブルから移行完了後に削除