# FEELCYCLE Hub アーキテクチャドキュメント

## 概要

FEELCYCLE Hub は、清潔なアーキテクチャ（Clean Architecture）の原則に基づいて設計されたNext.js アプリケーションです。

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Pages     │  │  Components  │  │     Hooks       │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  UseCases   │  │   Services   │  │   Controllers   │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Entities   │  │   Services   │  │  Repositories   │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │ API Clients │  │  Repositories │  │    Storage      │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## ディレクトリ構造

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # UI components (shadcn/ui)
│   └── shared/            # Shared components
├── hooks/                 # Custom React hooks
├── contexts/              # React contexts
├── types/                 # TypeScript type definitions
│   ├── global.ts          # Global types
│   └── strict.ts          # Strict typing utilities
├── architecture/          # Architecture definitions
│   └── index.ts           # Core architecture interfaces
├── domain/               # Domain layer
│   ├── models/           # Domain entities and value objects
│   ├── services/         # Domain services
│   └── repositories/     # Repository interfaces
├── application/          # Application layer
│   └── usecases/         # Use cases (business logic)
├── infrastructure/       # Infrastructure layer
│   └── repositories/     # Repository implementations
├── utils/                # Utility functions
│   ├── validation.ts     # Type-safe validation
│   ├── errorHandler.ts   # Error handling
│   ├── performanceMonitor.ts # Performance monitoring
│   └── dateUtils.ts      # Date utilities
└── __tests__/            # Test files
```

## 層の責務

### 1. Presentation Layer（プレゼンテーション層）

**責務：**
- ユーザーインターフェースの表示
- ユーザー入力の処理
- 状態の管理（UI状態のみ）

**主要ファイル：**
- `app/*/page.tsx` - Next.js pages
- `components/**/*.tsx` - React components
- `hooks/**/*.ts` - Custom hooks
- `contexts/**/*.tsx` - React contexts

**依存関係：**
- Application Layer のみに依存
- Domain Layer や Infrastructure Layer には直接依存しない

### 2. Application Layer（アプリケーション層）

**責務：**
- ビジネスロジックの実行
- ユースケースの実装
- 他の層の連携

**主要ファイル：**
- `application/usecases/*.ts` - ユースケース実装
- `services/*.ts` - アプリケーションサービス

**依存関係：**
- Domain Layer に依存
- Infrastructure Layer には依存しない（依存性注入で解決）

### 3. Domain Layer（ドメイン層）

**責務：**
- ビジネスルールの定義
- ドメインモデルの実装
- ドメインサービスの定義

**主要ファイル：**
- `domain/models/*.ts` - エンティティ、値オブジェクト
- `domain/services/*.ts` - ドメインサービス
- `domain/repositories/*.ts` - リポジトリインターフェース

**依存関係：**
- 他の層に依存しない（最も独立した層）

### 4. Infrastructure Layer（インフラストラクチャ層）

**責務：**
- 外部システムとの通信
- データの永続化
- 技術的な詳細の実装

**主要ファイル：**
- `infrastructure/repositories/*.ts` - リポジトリ実装
- API クライアント実装
- キャッシュ実装

**依存関係：**
- Domain Layer のインターフェースを実装
- Application Layer には依存しない

## 依存性注入

アプリケーションでは依存性注入（DI）パターンを使用して、層間の依存関係を管理しています。

```typescript
// 例：依存性注入の使用
const container = DependencyContainer.getInstance();
container.register('lessonRepository', new ApiLessonRepository(apiClient, cache));

const getLessonsUseCase = new GetLessonsUseCase(
  container.resolve('lessonRepository')
);
```

## データフロー

1. **ユーザーアクション** → Presentation Layer
2. **UI イベント** → Application Layer (UseCase)
3. **ビジネスロジック実行** → Domain Layer
4. **データアクセス** → Infrastructure Layer
5. **結果の返却** → Presentation Layer

## 型安全性

### 厳格な TypeScript 設定

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 型ガードの活用

```typescript
// 例：型安全なデータ検証
function processUserData(data: unknown): UserData | null {
  if (isUserData(data)) {
    return data; // 型安全
  }
  return null;
}
```

### バリデーション

全ての外部データはスキーマベースバリデーションを通過します：

```typescript
const userSchema = createSchemaValidator({
  name: { required: true, type: isString },
  email: { required: true, type: isEmail }
});

const result = userSchema(inputData);
if (result.isValid) {
  // result.data は型安全
}
```

## エラーハンドリング

### 構造化エラー

```typescript
interface StructuredError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'validation' | 'network' | 'business' | 'system';
  context: JsonObject;
}
```

### エラー境界

各レベルでエラーハンドリングを実装：

```typescript
// UseCase レベル
const result = await withErrorBoundary(
  () => useCase.execute(input),
  'application'
);

// Repository レベル
const data = await withRepositoryErrorHandling(
  () => repository.findById(id),
  'findById',
  'Lesson'
);
```

## パフォーマンス

### キャッシュ戦略

- **メモリキャッシュ**: 頻繁にアクセスするデータ
- **API キャッシュ**: API レスポンスの短期キャッシュ
- **ローカルストレージ**: ユーザー設定の永続化

### 監視

- Core Web Vitals の自動測定
- API レスポンス時間の監視
- バンドルサイズの監視

## テスト戦略

### テスト構成

```
src/__tests__/
├── unit/           # ユニットテスト
├── integration/    # 統合テスト
└── e2e/           # End-to-End テスト
```

### カバレッジ目標

- **全体**: 30%以上
- **重要機能**: 100%
- **ユーティリティ**: 80%以上

## 開発ワークフロー

### 1. 機能開発手順

1. Domain Layer から開始（エンティティ、ドメインサービス）
2. Application Layer（ユースケース）の実装
3. Infrastructure Layer（リポジトリ実装）の実装
4. Presentation Layer（UI）の実装
5. テストの追加

### 2. コード品質チェック

```bash
npm run lint          # ESLint チェック
npm run type-check    # TypeScript チェック
npm run test          # テスト実行
npm run test:coverage # カバレッジ計測
```

### 3. デプロイメント

GitHub Actions による CI/CD パイプライン：

1. セキュリティスキャン
2. 型チェック・Lint
3. テスト実行
4. ビルド
5. デプロイ

## 最適化とベストプラクティス

### 1. バンドルサイズ最適化

- Tree shaking の活用
- 動的インポートによるコード分割
- 未使用依存関係の除去

### 2. パフォーマンス最適化

- React.memo の適切な使用
- useMemo, useCallback の最適化
- 画像の最適化（Next.js Image）

### 3. SEO 最適化

- メタデータの最適化
- 構造化データの実装
- サイトマップの生成

## セキュリティ

### 1. 入力検証

- 全ての外部入力に対するバリデーション
- SQL インジェクション対策
- XSS 対策

### 2. 認証・認可

- JWTトークンの安全な管理
- CSRF 対策
- セキュリティヘッダーの実装

### 3. 依存関係管理

- 定期的な脆弱性スキャン
- npm audit の継続実行
- 依存関係の最小化

## 今後の拡張計画

### Phase 4.4: プラグイン機能

- モジュラー設計の実装
- プラグインアーキテクチャの構築
- 外部連携機能の拡張

### 長期的な改善

- マイクロフロントエンド化
- PWA 対応の強化
- リアルタイム機能の追加

---

このドキュメントは開発チームの理解とコードの保守性向上を目的として作成されています。
質問や改善提案があれば、GitHubのIssueでお知らせください。