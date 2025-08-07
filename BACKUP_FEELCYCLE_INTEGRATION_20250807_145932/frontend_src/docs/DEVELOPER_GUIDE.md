# FEELCYCLE Hub 開発者ガイド

## 目次

1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [開発ワークフロー](#開発ワークフロー)
3. [コーディング規約](#コーディング規約)
4. [テスト](#テスト)
5. [デバッグ](#デバッグ)
6. [トラブルシューティング](#トラブルシューティング)
7. [リリース手順](#リリース手順)

## 開発環境のセットアップ

### 必要なツール

- Node.js 18.0.0 以上
- npm 9.0.0 以上
- Git
- VSCode (推奨)

### 初期セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-org/feelcycle-hub.git
cd feelcycle-hub

# フロントエンド依存関係をインストール
cd frontend
npm install

# 開発サーバーを起動
npm run dev
```

### VSCode 拡張機能（推奨）

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-jest"
  ]
}
```

### 環境変数

`.env.local` ファイルを作成：

```env
# API設定
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# LIFF設定（オプション）
NEXT_PUBLIC_LIFF_ID=your-liff-id

# デバッグ設定
NEXT_PUBLIC_DEBUG_ENABLED=true

# 機能フラグ
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

## 開発ワークフロー

### ブランチ戦略

```
main
├── develop
│   ├── feature/add-lesson-search
│   ├── feature/improve-ui-performance
│   └── bugfix/fix-date-display
├── release/v1.2.0
└── hotfix/critical-bug-fix
```

### 機能開発の手順

#### 1. 新機能ブランチの作成

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

#### 2. ドメイン層から開始

```typescript
// 1. エンティティの定義
// src/domain/models/NewFeature.ts
export class NewFeatureEntity extends BaseEntity {
  // implementation
}

// 2. ドメインサービスの実装
// src/domain/services/NewFeatureService.ts
export class NewFeatureDomainService {
  // business logic
}

// 3. リポジトリインターフェースの定義
// src/domain/repositories/NewFeatureRepository.ts
export interface NewFeatureRepository {
  // interface definition
}
```

#### 3. アプリケーション層の実装

```typescript
// src/application/usecases/NewFeatureUseCase.ts
export class NewFeatureUseCase extends BaseUseCase<Input, Output> {
  async execute(input: Input): Promise<Output> {
    // use case implementation
  }
}
```

#### 4. インフラ層の実装

```typescript
// src/infrastructure/repositories/NewFeatureRepository.ts
export class ApiNewFeatureRepository implements NewFeatureRepository {
  // repository implementation
}
```

#### 5. プレゼンテーション層の実装

```typescript
// src/components/NewFeature.tsx
export function NewFeature(): JSX.Element {
  // React component
}
```

#### 6. テストの追加

```typescript
// src/__tests__/newFeature.test.ts
describe('NewFeature', () => {
  test('should work correctly', () => {
    // test implementation
  });
});
```

### コミット規約

[Conventional Commits](https://www.conventionalcommits.org/) 形式を使用：

```
feat: add lesson search functionality
fix: resolve date display issue
docs: update API documentation
style: format code with prettier
refactor: improve error handling
test: add unit tests for validation
chore: update dependencies
```

### プルリクエスト

#### テンプレート

```markdown
## 変更内容

- [ ] 機能追加
- [ ] バグ修正
- [ ] ドキュメント更新
- [ ] リファクタリング

## 説明

この変更の目的と背景を説明してください。

## テスト

- [ ] 単体テストを追加/更新
- [ ] 統合テストを実行
- [ ] 手動テストを実施

## チェックリスト

- [ ] コードは型安全
- [ ] ESLint エラーがない
- [ ] テストが通る
- [ ] ドキュメントを更新
```

## コーディング規約

### TypeScript

#### 1. 型定義

```typescript
// ✅ Good: 明示的な型定義
interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

// ❌ Bad: any の使用
function processData(data: any): any {
  return data;
}

// ✅ Good: 型安全なアプローチ
function processData<T>(data: T, validator: (value: unknown) => value is T): T {
  if (validator(data)) {
    return data;
  }
  throw new Error('Invalid data');
}
```

#### 2. 関数定義

```typescript
// ✅ Good: 戻り値の型を明示
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good: async 関数の型定義
async function fetchUser(id: string): Promise<User | null> {
  try {
    return await userRepository.findById(id);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

#### 3. エラーハンドリング

```typescript
// ✅ Good: 構造化エラー
try {
  await riskyOperation();
} catch (error) {
  throw new StructuredError(
    'OPERATION_FAILED',
    'Risk operation failed',
    'high',
    'business',
    { originalError: error }
  );
}

// ✅ Good: Result パターン
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function safeOperation(): Promise<Result<Data, string>> {
  try {
    const data = await fetchData();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### React

#### 1. コンポーネント定義

```tsx
// ✅ Good: 型安全なプロパティ
interface ButtonProps {
  readonly variant: 'primary' | 'secondary';
  readonly size: 'sm' | 'md' | 'lg';
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

export function Button({ 
  variant, 
  size, 
  disabled = false, 
  onClick, 
  children 
}: ButtonProps): JSX.Element {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

#### 2. hooks の使用

```tsx
// ✅ Good: カスタムhookの型定義
interface UseLessonSearchResult {
  lessons: Lesson[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
}

export function useLessonSearch(): UseLessonSearchResult {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<void> => {
    setLoading(true);
    try {
      const results = await lessonService.search(query);
      setLessons(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { lessons, loading, error, search };
}
```

### CSS/Tailwind

#### 1. ユーティリティクラスの使用

```tsx
// ✅ Good: 意味のあるクラス構成
<div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">
    Title
  </h2>
  <p className="text-gray-600 leading-relaxed">
    Description
  </p>
</div>
```

#### 2. レスポンシブデザイン

```tsx
// ✅ Good: モバイルファーストアプローチ
<div className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4
">
  {items.map(item => (
    <ItemCard key={item.id} item={item} />
  ))}
</div>
```

## テスト

### テスト戦略

#### 1. ユニットテスト

```typescript
// src/__tests__/validation.test.ts
describe('Validation Functions', () => {
  test('isEmail should validate email addresses', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('invalid-email')).toBe(false);
  });

  test('required validator should reject empty values', () => {
    const validator = required('Required field');
    
    expect(validator('')).toBe('Required field');
    expect(validator('value')).toBeUndefined();
  });
});
```

#### 2. 統合テスト

```typescript
// src/__tests__/integration/userSettings.test.ts
describe('User Settings Integration', () => {
  test('should save and retrieve user preferences', async () => {
    const repository = new LocalStorageUserPreferencesRepository();
    const useCase = new UpdateUserPreferencesUseCase(repository);
    
    const result = await useCase.execute({
      userId: 'test-user',
      preferences: {
        favoriteStudios: ['SH', 'SHB'],
        notificationTiming: 30
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.preferences.favoriteStudios).toEqual(['SH', 'SHB']);
  });
});
```

#### 3. React コンポーネントテスト

```tsx
// src/__tests__/components/Button.test.tsx
import { render, fireEvent, screen } from '@testing-library/react';
import { Button } from '../components/Button';

describe('Button Component', () => {
  test('should render correctly', () => {
    render(<Button variant="primary" size="md" onClick={() => {}}>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  test('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button variant="primary" size="md" onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### テスト実行

```bash
# 全テスト実行
npm test

# 特定のテストファイル
npm test -- validation.test.ts

# カバレッジ付き実行
npm run test:coverage

# ウォッチモード
npm test -- --watch
```

## デバッグ

### 1. ブラウザ開発者ツール

- **Console**: エラーログとデバッグ情報
- **Network**: API リクエスト/レスポンス
- **Performance**: パフォーマンス分析
- **Application**: localStorage, sessionStorage

### 2. VSCode デバッガー

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "pwa-chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### 3. ログ出力

```typescript
// 開発環境でのみログ出力
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// 構造化ログ
logger.info('User action', {
  userId,
  action: 'lesson-search',
  query,
  resultCount: results.length
});
```

### 4. React Developer Tools

- コンポーネントツリーの確認
- Props と State の監視
- パフォーマンスプロファイリング

## トラブルシューティング

### よくある問題と解決法

#### 1. TypeScript エラー

```bash
# 型チェックエラーの詳細確認
npx tsc --noEmit

# 型定義ファイルの再生成
rm -rf .next
npm run build
```

#### 2. ESLint エラー

```bash
# 自動修正可能なエラーを修正
npx eslint --fix src/

# 特定ファイルのチェック
npx eslint src/components/Button.tsx
```

#### 3. テストエラー

```bash
# Jest キャッシュをクリア
npx jest --clearCache

# 詳細なエラー情報
npm test -- --verbose
```

#### 4. ビルドエラー

```bash
# クリーンビルド
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### パフォーマンス問題

#### 1. バンドルサイズ分析

```bash
# バンドルアナライザー実行
npm run analyze

# 依存関係のサイズ確認
npx bundlephobia [package-name]
```

#### 2. レンダリングパフォーマンス

```typescript
// React DevTools Profiler使用
// または React.Profiler コンポーネント
function MyComponent(): JSX.Element {
  return (
    <React.Profiler id="MyComponent" onRender={onRenderCallback}>
      <ExpensiveComponent />
    </React.Profiler>
  );
}
```

## リリース手順

### 1. リリース前チェック

```bash
# 全テスト実行
npm test

# 型チェック
npm run type-check

# Lint チェック
npm run lint

# ビルドテスト
npm run build

# セキュリティ監査
npm audit
```

### 2. バージョン管理

```bash
# パッチリリース (1.0.0 -> 1.0.1)
npm version patch

# マイナーリリース (1.0.0 -> 1.1.0)
npm version minor

# メジャーリリース (1.0.0 -> 2.0.0)
npm version major
```

### 3. デプロイ

```bash
# Staging環境へのデプロイ
git push origin release/v1.2.0

# Production環境へのデプロイ
git checkout main
git merge release/v1.2.0
git push origin main
```

### 4. リリース後

- リリースノートの作成
- ドキュメントの更新
- 監視ダッシュボードの確認
- ユーザーフィードバックの収集

## 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

このガイドは継続的に更新されます。質問や改善提案があれば、チームにお知らせください。