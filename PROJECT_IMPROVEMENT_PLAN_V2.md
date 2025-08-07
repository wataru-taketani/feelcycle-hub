# 🚀 FEELCYCLE Hub - 統合改善計画書 V2

## 🎯 プロジェクト改善指示（Claude Code用）

あなたはシニアソフトウェアエンジニアとして、`/Users/wataru/Projects/feelcycle-hub`プロジェクトの**技術的負債解消と開発・運用プロセスの抜本的改善**をリードしてください。

### プロジェクト概要
- **目的**: FEELCYCLEユーザーのレッスン予約・管理体験向上サポートサービス
- **技術構成**: Next.js 14 + AWS Lambda + DynamoDB + AWS CDK + LINE API（フルスタックモノレポ）
- **現状**: サービス稼働中だが、手動運用・技術的負債・保守性に課題

### 主要課題
1. **開発プロセス**: CI/CD未整備、手動デプロイ、品質保証の属人化
2. **技術的負債**: 不安定なスクレイピング、テスト基盤不足、監視体制不備
3. **保守性**: フロントエンド・バックエンド・インフラの管理が分散
4. **セキュリティ**: 認証・データ保護・脆弱性対策の体系化不足

---

## 📋 Phase 0: 現状分析と戦略策定（3-5日）

### タスク0.1: 全体アーキテクチャの現状把握
```bash
# プロジェクト構造の定量分析
cd /Users/wataru/Projects/feelcycle-hub
find . -name "BACKUP_*" -type d | wc -l
find . -name "test-*" -type f | wc -l
find . -name "lambda-deployment-*.zip" | wc -l

# 各ワークスペースの健全性チェック
for workspace in frontend backend infra; do
  echo "=== $workspace ==="
  cd $workspace
  npm audit --audit-level=moderate
  npm outdated
  cd ..
done
```

### タスク0.2: 技術的負債の定量化
```bash
# コード品質分析
npx eslint frontend/src backend/src --ext .ts,.tsx,.js,.jsx --format json > code-quality-report.json
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | tail -1

# 依存関係の脆弱性分析
npm audit --json > security-audit.json
```

**報告要求**: 現状の問題点を優先度別（Critical/High/Medium/Low）でリストアップし、改善ROIを評価してください。

---

## 🔴 Phase 1: 開発・デプロイ基盤の統合構築（1-2週間）

### タスク1.1: フルスタックCI/CDパイプライン構築

#### バックエンドCI/CD: `.github/workflows/backend-ci-cd.yml`
```yaml
name: Backend CI/CD Pipeline
on:
  push:
    branches: [main, develop]
    paths: ['backend/**', 'infra/**']
  pull_request:
    branches: [main]
    paths: ['backend/**', 'infra/**']

jobs:
  backend-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install and test
        working-directory: backend
        run: |
          npm ci
          npm run lint
          npm run type-check
          npm run test -- --coverage
          npm run build
      
      - name: Deploy infrastructure
        if: github.ref == 'refs/heads/main'
        working-directory: backend
        run: |
          npm install -g aws-cdk
          cdk deploy --all --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

#### フロントエンドCI/CD: `.github/workflows/frontend-ci-cd.yml`
```yaml
name: Frontend CI/CD Pipeline
on:
  push:
    branches: [main, develop]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  frontend-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install and test
        working-directory: frontend
        run: |
          npm ci
          npm run lint
          npm run type-check
          npm run test
          npm run build
      
      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Deploy to Netlify
        if: github.ref == 'refs/heads/main'
        working-directory: frontend
        run: |
          npm run export
          npx netlify-cli deploy --prod --dir=out
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### タスク1.2: 環境別設定の体系化
```typescript
// shared/config/environments.ts
export const ENVIRONMENTS = {
  development: {
    api: {
      baseUrl: 'http://localhost:3001',
      timeout: 30000
    },
    aws: {
      region: 'ap-northeast-1',
      stage: 'dev'
    }
  },
  staging: {
    api: {
      baseUrl: 'https://staging-api.feelcycle-hub.com',
      timeout: 15000
    },
    aws: {
      region: 'ap-northeast-1', 
      stage: 'staging'
    }
  },
  production: {
    api: {
      baseUrl: 'https://api.feelcycle-hub.com',
      timeout: 10000
    },
    aws: {
      region: 'ap-northeast-1',
      stage: 'prod'
    }
  }
} as const;
```

**完了基準**: 
- フロントエンド・バックエンド両方のCI/CDが正常動作
- 環境別デプロイが自動化
- Lighthouse スコア90以上

---

## 🟡 Phase 2: 品質保証とセキュリティ強化（2-3週間）

### タスク2.1: 包括的テスト基盤の構築

#### バックエンドテスト: `backend/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

#### フロントエンドテスト: `frontend/jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
```

### タスク2.2: セキュリティ強化の実装

#### API認証・認可の強化: `backend/src/middleware/auth.ts`
```typescript
import jwt from 'jsonwebtoken';

export class AuthMiddleware {
  static validateJWT(token: string): Promise<UserContext> {
    // JWT検証ロジック
    // レート制限の実装
    // 権限チェック
  }
  
  static rateLimiter(maxRequests: number, windowMs: number) {
    // Redis/DynamoDBベースのレート制限
  }
}
```

#### データ暗号化: `backend/src/utils/encryption.ts`
```typescript
export class DataEncryption {
  static encryptPII(data: string): string {
    // 個人情報の暗号化
  }
  
  static hashSensitiveData(data: string): string {
    // ハッシュ化処理
  }
}
```

### タスク2.3: スクレイピング堅牢化の設計方針
```typescript
// backend/src/config/scraping-config.ts
export const SCRAPING_CONFIG = {
  selectors: {
    // 設定の外部化
  },
  resilience: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    circuitBreakerThreshold: 5
  },
  monitoring: {
    successRateThreshold: 0.95,
    alertOnConsecutiveFailures: 3
  }
} as const;
```

**完了基準**:
- フロントエンド・バックエンドのテストカバレッジ80%以上
- セキュリティ脆弱性スキャンでCritical/High問題ゼロ
- スクレイピング成功率95%以上

---

## 🟢 Phase 3: 運用監視とパフォーマンス最適化（2-3週間）

### タスク3.1: 統合監視システムの構築
```typescript
// backend/infrastructure/monitoring-stack.ts
export class ComprehensiveMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // CloudWatch Dashboard
    // SNS Alerts
    // Lambda監視
    // DynamoDB監視
    // API Gateway監視
    // フロントエンドパフォーマンス監視
  }
}
```

### タスク3.2: コスト最適化
```typescript
// backend/infrastructure/cost-optimization.ts
export class CostOptimizationStack extends cdk.Stack {
  // Lambda関数のメモリ・タイムアウト最適化
  // DynamoDB On-Demand vs Provisioned分析
  // CloudWatch Logs保持期間設定
  // 未使用リソースの自動削除
}
```

**完了基準**:
- システム稼働率99.5%以上
- 平均レスポンス時間2秒以内
- 運用コスト20%削減

---

## 🔵 Phase 4: 長期保守性と拡張性向上（3-4週間）

### タスク4.1: アーキテクチャリファクタリング
- マイクロサービス化の検討
- イベント駆動アーキテクチャの導入
- キャッシュ戦略の最適化

### タスク4.2: 開発者体験の向上
- モノレポ管理ツールの導入（Nx/Lerna）
- 開発環境のDocker化
- ホットリロード・デバッグ環境の改善

### タスク4.3: ドキュメント・ナレッジ体系化
- API仕様書の自動生成
- アーキテクチャ決定記録（ADR）の作成
- 運用手順書の整備

**完了基準**:
- 新機能開発速度50%向上
- 障害対応時間75%短縮
- 開発者オンボーディング時間50%短縮

---

## 📊 進捗管理と品質保証

### 各Phase完了時の必須報告
1. **実装内容**: 作成・変更ファイル詳細
2. **品質指標**: テスト結果・カバレッジ・パフォーマンス
3. **セキュリティ**: 脆弱性スキャン結果
4. **運用指標**: 稼働率・レスポンス時間・エラー率
5. **課題・リスク**: 発見事項と対応策

### 最終成功指標
- [ ] **開発効率**: CI/CD成功率98%以上、デプロイ時間5分以内
- [ ] **品質**: テストカバレッジ85%以上、Critical脆弱性ゼロ
- [ ] **安定性**: システム稼働率99.5%以上、MTTR15分以内
- [ ] **パフォーマンス**: API応答2秒以内、フロントエンドLCP2秒以内
- [ ] **保守性**: 新機能開発速度50%向上、技術的負債75%削減

---

## ⚠️ 実行ガイドライン

### 安全な作業原則
1. **段階的実装**: 各Phaseを独立したブランチで実装
2. **環境分離**: dev → staging → production の順でデプロイ
3. **ロールバック準備**: 各変更にロールバック手順を用意
4. **データ保護**: 本番データのバックアップを必須とする

### 緊急時対応
- 本番影響が発生した場合は即座に作業中断
- インシデント詳細の記録と影響範囲の特定
- 必要に応じた即座のロールバック実行

---

**Phase 0の現状分析から開始してください。**

プロジェクト全体の健全性を把握し、改善の優先順位を決定するため、上記の分析コマンドを実行して詳細な現状報告をお願いします。
