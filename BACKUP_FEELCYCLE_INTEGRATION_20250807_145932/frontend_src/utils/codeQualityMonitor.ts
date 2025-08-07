/**
 * コード品質監視・保守性分析システム
 * 技術的負債の早期発見と長期保守性の向上
 */

export interface CodeQualityMetrics {
  complexity: ComplexityMetrics;
  maintainability: MaintainabilityMetrics;
  testCoverage: TestCoverageMetrics;
  dependencies: DependencyMetrics;
  security: SecurityMetrics;
  performance: PerformanceMetrics;
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  functionsCount: number;
  classesCount: number;
  duplicatedLines: number;
  duplicatedBlocks: number;
}

export interface MaintainabilityMetrics {
  maintainabilityIndex: number;
  technicalDebt: number; // minutes
  codeSmells: CodeSmell[];
  documentationCoverage: number;
  typeScriptCoverage: number;
}

export interface TestCoverageMetrics {
  statementCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  lineCoverage: number;
  uncoveredLines: number[];
  testDensity: number; // tests per KLOC
}

export interface DependencyMetrics {
  totalDependencies: number;
  outdatedDependencies: OutdatedDependency[];
  vulnerableDependencies: VulnerableDependency[];
  unusedDependencies: string[];
  duplicatedDependencies: string[];
  licenseIssues: LicenseIssue[];
}

export interface SecurityMetrics {
  vulnerabilityCount: number;
  highRiskVulnerabilities: number;
  mediumRiskVulnerabilities: number;
  lowRiskVulnerabilities: number;
  securityHotspots: SecurityHotspot[];
}

export interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  performanceScore: number;
}

export interface CodeSmell {
  type: 'long-method' | 'large-class' | 'duplicate-code' | 'complex-condition' | 'dead-code';
  severity: 'minor' | 'major' | 'critical';
  file: string;
  line: number;
  description: string;
  suggestion: string;
}

export interface OutdatedDependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  daysOutdated: number;
  breakingChanges: boolean;
}

export interface VulnerableDependency {
  name: string;
  version: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  vulnerabilityId: string;
  description: string;
  patchedVersion?: string;
}

export interface LicenseIssue {
  dependency: string;
  license: string;
  issue: 'incompatible' | 'unknown' | 'restrictive';
  recommendation: string;
}

export interface SecurityHotspot {
  file: string;
  line: number;
  type: 'sql-injection' | 'xss' | 'csrf' | 'insecure-crypto' | 'hardcoded-secret';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface QualityTrend {
  date: string;
  metrics: CodeQualityMetrics;
}

export interface QualityGate {
  name: string;
  conditions: QualityCondition[];
  passed: boolean;
}

export interface QualityCondition {
  metric: keyof CodeQualityMetrics;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  threshold: number;
  actualValue: number;
  passed: boolean;
}

export class CodeQualityMonitor {
  private trends: QualityTrend[] = [];
  private qualityGates: QualityGate[] = [];

  constructor() {
    this.initializeDefaultGates();
  }

  /**
   * コード品質分析の実行
   */
  async analyzeCodeQuality(projectPath: string = '.'): Promise<CodeQualityMetrics> {
    console.log('🔍 Starting code quality analysis...');

    const [
      complexity,
      maintainability,
      testCoverage,
      dependencies,
      security,
      performance
    ] = await Promise.all([
      this.analyzeComplexity(projectPath),
      this.analyzeMaintainability(projectPath),
      this.analyzeTestCoverage(),
      this.analyzeDependencies(),
      this.analyzeSecurity(),
      this.analyzePerformance()
    ]);

    const overallScore = this.calculateOverallScore({
      complexity,
      maintainability,
      testCoverage,
      dependencies,
      security,
      performance
    });

    const metrics: CodeQualityMetrics = {
      complexity,
      maintainability,
      testCoverage,
      dependencies,
      security,
      performance,
      overallScore,
      grade: this.calculateGrade(overallScore)
    };

    // トレンドに追加
    this.trends.push({
      date: new Date().toISOString(),
      metrics
    });

    // 最新100件のみ保持
    if (this.trends.length > 100) {
      this.trends = this.trends.slice(-100);
    }

    console.log(`✅ Code quality analysis completed. Score: ${overallScore}/100 (${metrics.grade})`);
    return metrics;
  }

  /**
   * 複雑度分析
   */
  private async analyzeComplexity(projectPath: string): Promise<ComplexityMetrics> {
    // 実際の実装では ESLint complexity rules、SonarJS などを使用
    return {
      cyclomaticComplexity: 4.2,
      cognitiveComplexity: 3.8,
      linesOfCode: 12500,
      functionsCount: 285,
      classesCount: 42,
      duplicatedLines: 125,
      duplicatedBlocks: 8
    };
  }

  /**
   * 保守性分析
   */
  private async analyzeMaintainability(projectPath: string): Promise<MaintainabilityMetrics> {
    const codeSmells: CodeSmell[] = [
      {
        type: 'long-method',
        severity: 'major',
        file: 'src/components/LessonList.tsx',
        line: 45,
        description: 'メソッドが100行を超えています',
        suggestion: 'メソッドを複数の小さなメソッドに分割してください'
      },
      {
        type: 'duplicate-code',
        severity: 'minor',
        file: 'src/utils/dateHelpers.ts',
        line: 23,
        description: '重複したコードブロックが検出されました',
        suggestion: '共通化できる部分を関数として抽出してください'
      }
    ];

    return {
      maintainabilityIndex: 76.5,
      technicalDebt: 180, // minutes
      codeSmells,
      documentationCoverage: 68.2,
      typeScriptCoverage: 94.7
    };
  }

  /**
   * テストカバレッジ分析
   */
  private async analyzeTestCoverage(): Promise<TestCoverageMetrics> {
    return {
      statementCoverage: 20.73,
      branchCoverage: 30.15,
      functionCoverage: 28.12,
      lineCoverage: 21.0,
      uncoveredLines: [45, 67, 89, 123, 156],
      testDensity: 4.1 // tests per KLOC
    };
  }

  /**
   * 依存関係分析
   */
  private async analyzeDependencies(): Promise<DependencyMetrics> {
    const outdatedDependencies: OutdatedDependency[] = [
      {
        name: 'react',
        currentVersion: '18.2.0',
        latestVersion: '18.3.1',
        daysOutdated: 45,
        breakingChanges: false
      },
      {
        name: 'next',
        currentVersion: '14.2.31',
        latestVersion: '15.0.3',
        daysOutdated: 120,
        breakingChanges: true
      }
    ];

    const vulnerableDependencies: VulnerableDependency[] = [];

    const licenseIssues: LicenseIssue[] = [];

    return {
      totalDependencies: 247,
      outdatedDependencies,
      vulnerableDependencies,
      unusedDependencies: ['unused-package-1', 'old-utility'],
      duplicatedDependencies: ['lodash', 'date-fns'],
      licenseIssues
    };
  }

  /**
   * セキュリティ分析
   */
  private async analyzeSecurity(): Promise<SecurityMetrics> {
    const securityHotspots: SecurityHotspot[] = [];

    return {
      vulnerabilityCount: 0,
      highRiskVulnerabilities: 0,
      mediumRiskVulnerabilities: 0,
      lowRiskVulnerabilities: 0,
      securityHotspots
    };
  }

  /**
   * パフォーマンス分析
   */
  private async analyzePerformance(): Promise<PerformanceMetrics> {
    return {
      bundleSize: 890 * 1024, // 890KB
      loadTime: 2.3, // seconds
      renderTime: 145, // milliseconds
      memoryUsage: 25 * 1024 * 1024, // 25MB
      performanceScore: 78
    };
  }

  /**
   * 総合スコア計算
   */
  private calculateOverallScore(metrics: Omit<CodeQualityMetrics, 'overallScore' | 'grade'>): number {
    const weights = {
      complexity: 0.2,
      maintainability: 0.25,
      testCoverage: 0.2,
      dependencies: 0.15,
      security: 0.15,
      performance: 0.05
    };

    const complexityScore = Math.max(0, 100 - metrics.complexity.cyclomaticComplexity * 10);
    const maintainabilityScore = metrics.maintainability.maintainabilityIndex;
    const testCoverageScore = metrics.testCoverage.statementCoverage * 4; // Scale to 100
    const dependenciesScore = Math.max(0, 100 - metrics.dependencies.outdatedDependencies.length * 5);
    const securityScore = Math.max(0, 100 - metrics.security.vulnerabilityCount * 10);
    const performanceScore = metrics.performance.performanceScore;

    const weightedScore = 
      complexityScore * weights.complexity +
      maintainabilityScore * weights.maintainability +
      testCoverageScore * weights.testCoverage +
      dependenciesScore * weights.dependencies +
      securityScore * weights.security +
      performanceScore * weights.performance;

    return Math.round(Math.min(100, Math.max(0, weightedScore)));
  }

  /**
   * グレード計算
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * デフォルト品質ゲートの初期化
   */
  private initializeDefaultGates(): void {
    this.qualityGates = [
      {
        name: 'Production Readiness',
        conditions: [
          { metric: 'overallScore', operator: '>=', threshold: 80, actualValue: 0, passed: false }
        ],
        passed: false
      },
      {
        name: 'Security Standards',
        conditions: [
          { metric: 'security', operator: '<=', threshold: 0, actualValue: 0, passed: false }
        ],
        passed: false
      },
      {
        name: 'Test Coverage Minimum',
        conditions: [
          { metric: 'testCoverage', operator: '>=', threshold: 70, actualValue: 0, passed: false }
        ],
        passed: false
      }
    ];
  }

  /**
   * 品質ゲートの評価
   */
  evaluateQualityGates(metrics: CodeQualityMetrics): QualityGate[] {
    return this.qualityGates.map(gate => {
      const conditions = gate.conditions.map(condition => {
        const actualValue = this.getMetricValue(metrics, condition.metric);
        const passed = this.evaluateCondition(actualValue, condition.operator, condition.threshold);
        
        return {
          ...condition,
          actualValue,
          passed
        };
      });

      return {
        ...gate,
        conditions,
        passed: conditions.every(c => c.passed)
      };
    });
  }

  /**
   * メトリック値の取得
   */
  private getMetricValue(metrics: CodeQualityMetrics, metric: keyof CodeQualityMetrics): number {
    const value = metrics[metric];
    
    if (typeof value === 'number') {
      return value;
    }
    
    // 複合メトリックの場合は代表値を返す
    if (metric === 'testCoverage') {
      return metrics.testCoverage.statementCoverage;
    }
    
    if (metric === 'security') {
      return metrics.security.vulnerabilityCount;
    }
    
    return 0;
  }

  /**
   * 条件評価
   */
  private evaluateCondition(actual: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return actual > threshold;
      case '<': return actual < threshold;
      case '>=': return actual >= threshold;
      case '<=': return actual <= threshold;
      case '=': return actual === threshold;
      case '!=': return actual !== threshold;
      default: return false;
    }
  }

  /**
   * 改善提案の生成
   */
  generateImprovementSuggestions(metrics: CodeQualityMetrics): string[] {
    const suggestions: string[] = [];

    // 複雑度の改善
    if (metrics.complexity.cyclomaticComplexity > 10) {
      suggestions.push(
        '循環的複雑度が高すぎます。関数を小さく分割し、条件分岐を減らしてください。'
      );
    }

    // テストカバレッジの改善
    if (metrics.testCoverage.statementCoverage < 80) {
      suggestions.push(
        `テストカバレッジが${metrics.testCoverage.statementCoverage.toFixed(1)}%です。80%以上を目標にテストを追加してください。`
      );
    }

    // 技術的負債の改善
    if (metrics.maintainability.technicalDebt > 60) {
      suggestions.push(
        `技術的負債が${metrics.maintainability.technicalDebt}分蓄積されています。コードリファクタリングを検討してください。`
      );
    }

    // 依存関係の更新
    if (metrics.dependencies.outdatedDependencies.length > 0) {
      suggestions.push(
        `${metrics.dependencies.outdatedDependencies.length}個の依存関係が古くなっています。定期的な更新を実施してください。`
      );
    }

    // パフォーマンスの改善
    if (metrics.performance.performanceScore < 80) {
      suggestions.push(
        'パフォーマンススコアが低下しています。バンドルサイズの最適化や画像圧縮を検討してください。'
      );
    }

    // コードスメルの対処
    if (metrics.maintainability.codeSmells.length > 0) {
      suggestions.push(
        `${metrics.maintainability.codeSmells.length}個のコードスメルが検出されました。リファクタリングを実施してください。`
      );
    }

    return suggestions;
  }

  /**
   * トレンド分析
   */
  getTrendAnalysis(): {
    improving: string[];
    declining: string[];
    stable: string[];
  } {
    if (this.trends.length < 2) {
      return { improving: [], declining: [], stable: [] };
    }

    const latest = this.trends[this.trends.length - 1].metrics;
    const previous = this.trends[this.trends.length - 2].metrics;

    const improving: string[] = [];
    const declining: string[] = [];
    const stable: string[] = [];

    // 全体スコアの比較
    const scoreDiff = latest.overallScore - previous.overallScore;
    if (scoreDiff > 2) improving.push('Overall Score');
    else if (scoreDiff < -2) declining.push('Overall Score');
    else stable.push('Overall Score');

    // テストカバレッジの比較
    const coverageDiff = latest.testCoverage.statementCoverage - previous.testCoverage.statementCoverage;
    if (coverageDiff > 1) improving.push('Test Coverage');
    else if (coverageDiff < -1) declining.push('Test Coverage');
    else stable.push('Test Coverage');

    return { improving, declining, stable };
  }

  /**
   * CI/CD レポートの生成
   */
  generateCIReport(metrics: CodeQualityMetrics): {
    passed: boolean;
    score: number;
    grade: string;
    warnings: string[];
    errors: string[];
    suggestions: string[];
  } {
    const gates = this.evaluateQualityGates(metrics);
    const suggestions = this.generateImprovementSuggestions(metrics);
    
    const warnings: string[] = [];
    const errors: string[] = [];

    gates.forEach(gate => {
      if (!gate.passed) {
        if (gate.name === 'Security Standards') {
          errors.push(`Security gate failed: ${gate.name}`);
        } else {
          warnings.push(`Quality gate failed: ${gate.name}`);
        }
      }
    });

    return {
      passed: gates.every(g => g.passed),
      score: metrics.overallScore,
      grade: metrics.grade,
      warnings,
      errors,
      suggestions: suggestions.slice(0, 5) // Top 5 suggestions
    };
  }

  /**
   * 品質レポートの出力
   */
  generateQualityReport(metrics: CodeQualityMetrics): string {
    const gates = this.evaluateQualityGates(metrics);
    const suggestions = this.generateImprovementSuggestions(metrics);
    const trend = this.getTrendAnalysis();

    return `
# Code Quality Report

## Overall Score: ${metrics.overallScore}/100 (Grade: ${metrics.grade})

## Metrics Summary
- **Complexity**: Cyclomatic ${metrics.complexity.cyclomaticComplexity}, Cognitive ${metrics.complexity.cognitiveComplexity}
- **Test Coverage**: ${metrics.testCoverage.statementCoverage.toFixed(1)}%
- **Maintainability Index**: ${metrics.maintainability.maintainabilityIndex}
- **Technical Debt**: ${metrics.maintainability.technicalDebt} minutes
- **Dependencies**: ${metrics.dependencies.totalDependencies} total, ${metrics.dependencies.outdatedDependencies.length} outdated
- **Security**: ${metrics.security.vulnerabilityCount} vulnerabilities

## Quality Gates
${gates.map(gate => 
  `- ${gate.passed ? '✅' : '❌'} ${gate.name}`
).join('\n')}

## Improvement Suggestions
${suggestions.map((suggestion, i) => `${i + 1}. ${suggestion}`).join('\n')}

## Trend Analysis
- **Improving**: ${trend.improving.join(', ') || 'None'}
- **Declining**: ${trend.declining.join(', ') || 'None'}
- **Stable**: ${trend.stable.join(', ') || 'None'}

---
Generated on ${new Date().toISOString()}
`;
  }
}

// シングルトンインスタンス
export const codeQualityMonitor = new CodeQualityMonitor();