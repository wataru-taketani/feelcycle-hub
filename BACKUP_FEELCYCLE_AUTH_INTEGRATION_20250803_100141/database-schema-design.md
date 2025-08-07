# FEELCYCLE Account Integration - Database Schema Design

## 新規テーブル: feelcycle-hub-user-feelcycle-data-dev

### Purpose
FEELCYCLEアカウントから取得したユーザー情報を永続化

### Schema
```json
{
  "userId": "string (PK)",           // LINE userId
  "feelcycleEmail": "string",        // FEELCYCLEログインメール
  "lastUpdated": "string",           // 最終更新日時 (ISO)
  "homeStudio": "string",            // 所属店舗
  "membershipType": "string",        // 会員種別
  "currentReservations": [           // 現在の予約状況
    {
      "reservationId": "string",
      "studioName": "string", 
      "lessonDate": "string",
      "lessonTime": "string",
      "programName": "string",
      "instructorName": "string"
    }
  ],
  "lessonHistory": [                 // 受講履歴
    {
      "lessonDate": "string",
      "studioName": "string",
      "lessonTime": "string", 
      "programName": "string",
      "instructorName": "string",
      "attendanceStatus": "string"    // attended/canceled/noshow
    }
  ],
  "dataScrapedAt": "string",         // データ取得日時
  "ttl": "number"                    // TTL (90日で自動削除)
}
```

## 既存テーブル拡張: feelcycle-hub-users-dev

### 追加フィールド
```json
{
  "feelcycleAccountLinked": "boolean",     // FEELCYCLE連携済みフラグ
  "feelcycleLastVerified": "string"        // 最終検証日時
}
```

## セキュリティ: AWS Secrets Manager

### feelcycle-user-credentials
```json
{
  "[userId]": {
    "email": "string",
    "encryptedPassword": "string",
    "salt": "string", 
    "createdAt": "string",
    "lastUsed": "string"
  }
}
```