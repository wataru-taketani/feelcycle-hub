# FEELCYCLE Hub API 仕様書

## 概要

FEELCYCLE Hub のフロントエンドとバックエンド間のAPI通信仕様を定義します。
RESTful APIの原則に従い、JSON形式でデータを交換します。

## 基本情報

- **Base URL**: `https://api.feelcycle-hub.com` (Production) / `http://localhost:3001` (Development)
- **API Version**: v1
- **Content-Type**: `application/json`
- **文字エンコーディング**: UTF-8

## 認証

### LIFF (LINE Front-end Framework) 認証

```http
Authorization: Bearer <liff_access_token>
```

### API レスポンス形式

#### 成功レスポンス

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error context"
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

## エンドポイント一覧

### 1. レッスン関連 API

#### 1.1 レッスン一覧取得

```http
GET /api/v1/lessons
```

**クエリパラメーター:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| studioCode | string | No | スタジオコード (例: "SH", "SHB") |
| programName | string | No | プログラム名 |
| instructorName | string | No | インストラクター名 |
| startDate | string | No | 開始日時 (ISO 8601) |
| endDate | string | No | 終了日時 (ISO 8601) |
| availability | string | No | 予約状況 ("available", "waitlist", "full") |
| difficulty | string | No | 難易度 (1-5のカンマ区切り) |
| page | number | No | ページ番号 (デフォルト: 1) |
| limit | number | No | 1ページあたりの件数 (デフォルト: 20) |

**レスポンス例:**

```json
{
  "success": true,
  "data": [
    {
      "id": "lesson_12345",
      "studioName": "新宿",
      "studioCode": "SH",
      "programName": "BB1",
      "instructorName": "田中 花子",
      "startTime": "2023-12-01T10:00:00.000Z",
      "endTime": "2023-12-01T10:45:00.000Z",
      "availability": "available",
      "difficulty": 3,
      "description": "ビギナー向けプログラム"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

#### 1.2 レッスン詳細取得

```http
GET /api/v1/lessons/{lessonId}
```

**パスパラメーター:**
- `lessonId`: レッスンID

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "id": "lesson_12345",
    "studioName": "新宿",
    "studioCode": "SH",
    "programName": "BB1",
    "instructorName": "田中 花子",
    "startTime": "2023-12-01T10:00:00.000Z",
    "endTime": "2023-12-01T10:45:00.000Z",
    "availability": "available",
    "difficulty": 3,
    "description": "ビギナー向けプログラム",
    "capacity": 20,
    "currentBookings": 15,
    "waitlistCount": 3
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

#### 1.3 レッスン検索

```http
POST /api/v1/lessons/search
```

**リクエストボディ:**

```json
{
  "query": "BB1 新宿",
  "filters": {
    "studioCode": "SH",
    "difficulty": [1, 2, 3],
    "timeSlots": ["morning", "evening"],
    "dateRange": {
      "start": "2023-12-01",
      "end": "2023-12-07"
    }
  },
  "sort": {
    "field": "startTime",
    "direction": "asc"
  }
}
```

#### 1.4 推奨レッスン取得

```http
GET /api/v1/lessons/recommended
```

**ヘッダー:**
```http
Authorization: Bearer <access_token>
```

### 2. インストラクター関連 API

#### 2.1 インストラクター一覧取得

```http
GET /api/v1/instructors
```

**クエリパラメーター:**
- `studioCode`: スタジオコード
- `specialty`: 専門プログラム
- `page`: ページ番号
- `limit`: 1ページあたりの件数

**レスポンス例:**

```json
{
  "success": true,
  "data": [
    {
      "id": "instructor_123",
      "name": "田中 花子",
      "studioCode": "SH",
      "bio": "フィットネス歴10年のベテランインストラクター",
      "specialties": ["BB1", "BB2", "BSB"],
      "rating": 4.8,
      "lessonsCount": 250,
      "profileImage": "https://example.com/profiles/instructor_123.jpg"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### 2.2 インストラクター詳細取得

```http
GET /api/v1/instructors/{instructorId}
```

#### 2.3 インストラクターの担当レッスン取得

```http
GET /api/v1/instructors/{instructorId}/lessons
```

### 3. 待機リスト関連 API

#### 3.1 待機リスト登録

```http
POST /api/v1/waitlist
```

**リクエストボディ:**

```json
{
  "lessonId": "lesson_12345",
  "userId": "user_67890"
}
```

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "waitlistEntryId": "waitlist_98765",
    "lessonId": "lesson_12345",
    "position": 3,
    "estimatedWaitTime": 120,
    "registeredAt": "2023-12-01T10:00:00.000Z"
  }
}
```

#### 3.2 待機リスト状況取得

```http
GET /api/v1/waitlist/user/{userId}
```

#### 3.3 待機リストキャンセル

```http
DELETE /api/v1/waitlist/{waitlistEntryId}
```

#### 3.4 レッスンの待機リスト状況

```http
GET /api/v1/lessons/{lessonId}/waitlist
```

### 4. ユーザー設定関連 API

#### 4.1 ユーザー設定取得

```http
GET /api/v1/user/preferences
```

**ヘッダー:**
```http
Authorization: Bearer <access_token>
```

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "favoriteStudios": ["SH", "SHB"],
    "favoriteInstructors": ["instructor_123", "instructor_456"],
    "interestedLessons": [
      {
        "programName": "BB1",
        "weight": 0.8
      },
      {
        "programName": "BSB",
        "weight": 0.6
      }
    ],
    "notificationSettings": {
      "enableLineNotifications": true,
      "enableEmailNotifications": false,
      "notificationTiming": 30
    }
  }
}
```

#### 4.2 ユーザー設定更新

```http
PUT /api/v1/user/preferences
```

**リクエストボディ:**

```json
{
  "favoriteStudios": ["SH", "SHB", "GNZ"],
  "favoriteInstructors": ["instructor_123"],
  "notificationSettings": {
    "enableLineNotifications": true,
    "notificationTiming": 60
  }
}
```

### 5. スタジオ関連 API

#### 5.1 スタジオ一覧取得

```http
GET /api/v1/studios
```

**レスポンス例:**

```json
{
  "success": true,
  "data": [
    {
      "code": "SH",
      "name": "新宿",
      "address": "東京都新宿区...",
      "phone": "03-1234-5678",
      "businessHours": {
        "weekday": {
          "open": "07:00",
          "close": "23:00"
        },
        "weekend": {
          "open": "08:00",
          "close": "21:00"
        }
      },
      "facilities": ["シャワー", "ロッカー", "パウダールーム"],
      "coordinates": {
        "latitude": 35.6895,
        "longitude": 139.6917
      }
    }
  ]
}
```

### 6. プログラム関連 API

#### 6.1 プログラム一覧取得

```http
GET /api/v1/programs
```

**レスポンス例:**

```json
{
  "success": true,
  "data": [
    {
      "id": "program_bb1",
      "name": "BB1",
      "fullName": "FEELCYCLE BB1",
      "difficulty": 2,
      "duration": 45,
      "description": "音楽に合わせたバイクエクササイズの入門プログラム",
      "category": "beginner",
      "calorieBurn": "400-600kcal",
      "targetMuscles": ["脚", "臀部", "体幹"],
      "musicStyle": "ポップス"
    }
  ]
}
```

### 7. 統計・分析 API

#### 7.1 ダッシュボード統計

```http
GET /api/v1/dashboard/stats
```

**ヘッダー:**
```http
Authorization: Bearer <access_token>
```

#### 7.2 人気プログラム取得

```http
GET /api/v1/stats/popular-programs
```

#### 7.3 スタジオ別統計

```http
GET /api/v1/stats/studios
```

## エラーコード一覧

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| INVALID_REQUEST | 400 | リクエストパラメータが不正 |
| UNAUTHORIZED | 401 | 認証が必要 |
| FORBIDDEN | 403 | アクセス権限なし |
| NOT_FOUND | 404 | リソースが見つからない |
| METHOD_NOT_ALLOWED | 405 | HTTPメソッドが許可されていない |
| VALIDATION_ERROR | 422 | バリデーションエラー |
| RATE_LIMIT_EXCEEDED | 429 | レート制限に達した |
| INTERNAL_SERVER_ERROR | 500 | サーバー内部エラー |
| SERVICE_UNAVAILABLE | 503 | サービス利用不可 |

### 具体的なエラー例

#### バリデーションエラー

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "studioCode": "Invalid studio code format",
      "startDate": "Date must be in ISO 8601 format"
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

#### レート制限エラー

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "resetTime": "2023-12-01T10:15:00.000Z"
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

## レート制限

- **認証済みユーザー**: 1000 requests/hour
- **未認証ユーザー**: 100 requests/hour
- **特定エンドポイント**:
  - 待機リスト登録: 10 requests/minute
  - レッスン検索: 60 requests/minute

## キャッシュ

### キャッシュヘッダー

```http
Cache-Control: public, max-age=300
ETag: "abc123def456"
Last-Modified: Wed, 21 Oct 2023 07:28:00 GMT
```

### キャッシュ戦略

- **スタジオ情報**: 24時間
- **プログラム情報**: 12時間
- **レッスン一覧**: 5分
- **インストラクター情報**: 1時間
- **ユーザー設定**: キャッシュなし

## バージョニング

### URL バージョニング

```
/api/v1/lessons
/api/v2/lessons
```

### 後方互換性

- v1 APIは最低6ヶ月間サポート
- 新機能はv2で実装
- 廃止予定機能は3ヶ月前に通知

## セキュリティ

### HTTPS必須

本番環境では全通信をHTTPS化

### CORS設定

```
Access-Control-Allow-Origin: https://feelcycle-hub.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### セキュリティヘッダー

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## SDK・ライブラリ

### JavaScript/TypeScript SDK

```bash
npm install @feelcycle-hub/api-client
```

```typescript
import { FeelcycleApiClient } from '@feelcycle-hub/api-client';

const client = new FeelcycleApiClient({
  baseUrl: 'https://api.feelcycle-hub.com',
  accessToken: 'your-access-token'
});

const lessons = await client.lessons.list({
  studioCode: 'SH',
  startDate: new Date()
});
```

## テスト環境

### Staging環境

- **Base URL**: `https://api-staging.feelcycle-hub.com`
- **特徴**: 本番環境のデータのコピー
- **更新頻度**: 毎日

### 開発環境

- **Base URL**: `http://localhost:3001`
- **特徴**: モックデータを使用
- **セットアップ**: `npm run dev` で起動

## 監視・ログ

### ヘルスチェック

```http
GET /health
```

**レスポンス:**

```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "external_api": "healthy"
  }
}
```

### メトリクス

```http
GET /metrics
```

Prometheus形式でメトリクスを出力

## サポート・お問い合わせ

- **開発者向けドキュメント**: https://docs.feelcycle-hub.com
- **GitHub Issues**: https://github.com/your-org/feelcycle-hub/issues
- **Slack**: #api-support チャンネル

---

このAPI仕様書は継続的に更新されます。最新版は開発者ポータルでご確認ください。