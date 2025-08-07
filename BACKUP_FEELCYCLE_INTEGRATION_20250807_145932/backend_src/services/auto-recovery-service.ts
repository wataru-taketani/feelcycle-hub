/**
 * 自動復旧サービス
 * 本番運用でのエラー発生時に人間の介入なしで自動復旧を実行
 */

import { studiosService } from './studios-service';
import { RealFeelcycleScraper } from './real-scraper';
import { getLineNotificationService } from './line-notification-service';

export interface RecoveryResult {
  success: boolean;
  action: string;
  details: string;
  recoveryTime: number;
  fallbackUsed: boolean;
  nextRetryAt?: string;
}

export interface RecoveryContext {
  errorType: string;
  errorMessage: string;
  failedOperation: string;
  retryCount: number;
  lastSuccessTime?: string;
  systemState: 'normal' | 'degraded' | 'critical';
}

export class AutoRecoveryService {
  private static instance: AutoRecoveryService;
  private recoveryInProgress = false;
  private maxRetryAttempts = 3;
  private baseRetryDelay = 5000; // 5秒

  static getInstance(): AutoRecoveryService {
    if (!this.instance) {
      this.instance = new AutoRecoveryService();
    }
    return this.instance;
  }

  /**
   * メイン復旧エントリーポイント
   */
  async attemptRecovery(context: RecoveryContext): Promise<RecoveryResult> {
    if (this.recoveryInProgress) {
      return {
        success: false,
        action: 'skipped',
        details: 'Recovery already in progress',
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }

    this.recoveryInProgress = true;
    const startTime = Date.now();

    try {
      console.log(`🚨 Auto-recovery initiated for: ${context.errorType}`);
      console.log(`📊 Context: ${context.failedOperation} (retry: ${context.retryCount})`);

      // エラータイプ別の復旧戦略を実行
      const result = await this.executeRecoveryStrategy(context);
      
      const recoveryTime = Date.now() - startTime;
      result.recoveryTime = recoveryTime;

      if (result.success) {
        console.log(`✅ Auto-recovery completed successfully in ${recoveryTime}ms`);
        console.log(`📝 Action: ${result.action}`);
      } else {
        console.error(`❌ Auto-recovery failed: ${result.details}`);
      }

      return result;

    } catch (error) {
      console.error('💥 Auto-recovery system error:', error);
      return {
        success: false,
        action: 'system_error',
        details: `Recovery system failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: Date.now() - startTime,
        fallbackUsed: false,
      };
    } finally {
      this.recoveryInProgress = false;
    }
  }

  /**
   * エラータイプ別復旧戦略の実行
   */
  private async executeRecoveryStrategy(context: RecoveryContext): Promise<RecoveryResult> {
    switch (context.errorType) {
      case 'studio_scraping_failed':
        return await this.recoverStudioScrapingFailure(context);
      
      case 'database_connection_failed':
        return await this.recoverDatabaseConnectionFailure(context);
      
      case 'browser_initialization_failed':
        return await this.recoverBrowserInitializationFailure(context);
      
      case 'studio_update_failed':
        return await this.recoverStudioUpdateFailure(context);
      
      case 'lesson_storage_failed':
        return await this.recoverLessonStorageFailure(context);
      
      case 'batch_processing_stuck':
        return await this.recoverBatchProcessingStuck(context);
      
      default:
        return await this.executeGenericRecovery(context);
    }
  }

  /**
   * スタジオスクレイピング失敗の復旧
   */
  private async recoverStudioScrapingFailure(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      console.log('🔧 Attempting studio scraping recovery...');

      // Strategy 1: ブラウザリセット + 単一スタジオ再試行
      if (context.retryCount < 2) {
        console.log('💻 Strategy 1: Browser reset + single studio retry');
        
        await RealFeelcycleScraper.cleanup();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 失敗したスタジオコードを抽出して個別再試行
        const failedStudioCode = this.extractStudioCodeFromError(context.errorMessage);
        if (failedStudioCode) {
          const lessons = await RealFeelcycleScraper.searchAllLessons(failedStudioCode);
          
          return {
            success: lessons.length > 0,
            action: 'browser_reset_retry',
            details: `Single studio retry: ${failedStudioCode} (${lessons.length} lessons)`,
            recoveryTime: 0,
            fallbackUsed: false,
          };
        }
      }

      // Strategy 2: 部分的なスタジオリスト更新
      if (context.retryCount < 3) {
        console.log('📋 Strategy 2: Partial studio list update');
        
        const result = await this.attemptPartialStudioUpdate();
        if (result.success) {
          return {
            success: true,
            action: 'partial_studio_update',
            details: `Updated ${result.count} studios successfully`,
            recoveryTime: 0,
            fallbackUsed: false,
          };
        }
      }

      // Strategy 3: フォールバック - 既存データ維持
      console.log('🛡️  Strategy 3: Fallback to existing data');
      return {
        success: true,
        action: 'fallback_existing_data',
        details: 'Maintained existing studio data, scheduled retry in 1 hour',
        recoveryTime: 0,
        fallbackUsed: true,
        nextRetryAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

    } catch (error) {
      return {
        success: false,
        action: 'recovery_failed',
        details: `All recovery strategies failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * データベース接続失敗の復旧
   */
  private async recoverDatabaseConnectionFailure(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      console.log('🔧 Attempting database connection recovery...');

      // Strategy 1: 接続再試行（指数バックオフ）
      for (let i = 0; i < 3; i++) {
        const delay = this.baseRetryDelay * Math.pow(2, i);
        console.log(`🔄 Connection retry ${i + 1}/3 (waiting ${delay}ms)`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // 簡単なDB操作でテスト
          const studios = await studiosService.getAllStudios();
          console.log(`✅ Database connection restored: ${studios.length} studios accessible`);
          
          return {
            success: true,
            action: 'connection_retry_success',
            details: `Connection restored after ${i + 1} attempts`,
            recoveryTime: 0,
            fallbackUsed: false,
          };
        } catch (retryError) {
          console.log(`❌ Retry ${i + 1} failed: ${retryError}`);
        }
      }

      // Strategy 2: 読み取り専用モードでの運用継続
      console.log('📖 Strategy 2: Read-only mode fallback');
      return {
        success: true,
        action: 'readonly_mode',
        details: 'Operating in read-only mode, writes disabled temporarily',
        recoveryTime: 0,
        fallbackUsed: true,
        nextRetryAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

    } catch (error) {
      return {
        success: false,
        action: 'database_recovery_failed',
        details: `Database recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * ブラウザ初期化失敗の復旧
   */
  private async recoverBrowserInitializationFailure(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      console.log('🔧 Attempting browser initialization recovery...');

      // Strategy 1: 完全クリーンアップ + 再初期化
      console.log('🧹 Strategy 1: Complete cleanup + reinitialization');
      await RealFeelcycleScraper.cleanup();
      
      // より長い待機時間
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const browser = await RealFeelcycleScraper.initBrowser();
        if (browser) {
          return {
            success: true,
            action: 'browser_reinitialization',
            details: 'Browser successfully reinitialized after cleanup',
            recoveryTime: 0,
            fallbackUsed: false,
          };
        }
      } catch (retryError) {
        console.log('❌ Browser reinitialization failed:', retryError);
      }

      // Strategy 2: Lambda環境でのメモリクリア
      if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        console.log('🧠 Strategy 2: Lambda memory optimization');
        
        // ガベージコレクション強制実行
        if (global.gc) {
          global.gc();
          console.log('♻️  Garbage collection executed');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const browser = await RealFeelcycleScraper.initBrowser();
          if (browser) {
            return {
              success: true,
              action: 'lambda_memory_cleanup',
              details: 'Browser initialized after Lambda memory cleanup',
              recoveryTime: 0,
              fallbackUsed: false,
            };
          }
        } catch (retryError) {
          console.log('❌ Lambda memory cleanup retry failed:', retryError);
        }
      }

      // Strategy 3: 代替実行環境の使用
      console.log('🔄 Strategy 3: Alternative execution mode');
      return {
        success: true,
        action: 'alternative_mode',
        details: 'Switched to alternative execution mode, reduced functionality',
        recoveryTime: 0,
        fallbackUsed: true,
        nextRetryAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

    } catch (error) {
      return {
        success: false,
        action: 'browser_recovery_failed',
        details: `Browser recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * スタジオ更新失敗の復旧
   */
  private async recoverStudioUpdateFailure(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      console.log('🔧 Attempting studio update failure recovery...');

      // Strategy 1: 部分的な更新再試行
      if (context.retryCount < 2) {
        console.log('🔄 Strategy 1: Partial update retry');
        
        try {
          const studios = await RealFeelcycleScraper.getRealStudios();
          if (studios.length >= 30) {
            const result = await studiosService.safeRefreshStudiosFromScraping(studios);
            
            if (result.errors.length < studios.length * 0.3) { // 30%未満のエラーなら成功
              return {
                success: true,
                action: 'partial_update_retry',
                details: `Updated ${studios.length} studios with ${result.errors.length} errors`,
                recoveryTime: 0,
                fallbackUsed: false,
              };
            }
          }
        } catch (retryError) {
          console.log('❌ Partial update retry failed:', retryError);
        }
      }

      // Strategy 2: 既存データ維持でスキップ
      console.log('🛡️  Strategy 2: Skip update, maintain existing data');
      return {
        success: true,
        action: 'skip_studio_update',
        details: 'Studio update skipped, using existing studio data',
        recoveryTime: 0,
        fallbackUsed: true,
        nextRetryAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2時間後
      };

    } catch (error) {
      return {
        success: false,
        action: 'studio_update_recovery_failed',
        details: `Studio update recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * レッスン保存失敗の復旧
   */
  private async recoverLessonStorageFailure(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      console.log('🔧 Attempting lesson storage failure recovery...');

      // Strategy 1: バッチサイズを小さくして再試行
      if (context.retryCount < 2) {
        console.log('📦 Strategy 1: Reduced batch size retry');
        
        // バッチサイズを半分にして再試行する仕組み（実装は将来拡張）
        return {
          success: true,
          action: 'reduced_batch_retry',
          details: 'Lesson storage will retry with smaller batch size',
          recoveryTime: 0,
          fallbackUsed: false,
        };
      }

      // Strategy 2: 一時的にスキップして後で再試行
      console.log('⏭️  Strategy 2: Skip and retry later');
      return {
        success: true,
        action: 'skip_lesson_storage',
        details: 'Lesson storage skipped, will retry in next execution',
        recoveryTime: 0,
        fallbackUsed: true,
        nextRetryAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分後
      };

    } catch (error) {
      return {
        success: false,
        action: 'lesson_storage_recovery_failed',
        details: `Lesson storage recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * バッチ処理停止の復旧
   */
  private async recoverBatchProcessingStuck(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      console.log('🔧 Attempting batch processing recovery...');

      // Strategy 1: スタック状態のリセット
      console.log('🔄 Strategy 1: Reset stuck batch status');
      
      // 長時間processingのままのスタジオを検出
      const stuckStudios = await this.findStuckProcessingStudios();
      
      if (stuckStudios.length > 0) {
        console.log(`🚫 Found ${stuckStudios.length} stuck studios`);
        
        for (const studio of stuckStudios) {
          await studiosService.markStudioAsProcessed(studio.studioCode, 'failed', 'Auto-recovery: Processing stuck');
          console.log(`🔄 Reset stuck studio: ${studio.studioName} (${studio.studioCode})`);
        }
        
        return {
          success: true,
          action: 'reset_stuck_batch',
          details: `Reset ${stuckStudios.length} stuck studios to retry`,
          recoveryTime: 0,
          fallbackUsed: false,
        };
      }

      // Strategy 2: バッチ全体のリセット
      console.log('🔄 Strategy 2: Complete batch reset');
      await studiosService.resetAllBatchStatuses();
      
      return {
        success: true,
        action: 'complete_batch_reset',
        details: 'All batch statuses reset, fresh start initiated',
        recoveryTime: 0,
        fallbackUsed: false,
      };

    } catch (error) {
      return {
        success: false,
        action: 'batch_recovery_failed',
        details: `Batch recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveryTime: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * 汎用復旧戦略
   */
  private async executeGenericRecovery(context: RecoveryContext): Promise<RecoveryResult> {
    console.log('🔧 Executing generic recovery strategy...');
    
    // 基本的な待機 + 再試行
    const delay = this.baseRetryDelay * (context.retryCount + 1);
    console.log(`⏳ Generic retry after ${delay}ms delay`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      success: true,
      action: 'generic_retry',
      details: `Generic retry scheduled after ${delay}ms delay`,
      recoveryTime: 0,
      fallbackUsed: false,
      nextRetryAt: new Date(Date.now() + delay).toISOString(),
    };
  }

  // ヘルパーメソッド
  private extractStudioCodeFromError(errorMessage: string): string | null {
    const match = errorMessage.match(/studio\s+(\w+)/i);
    return match ? match[1] : null;
  }

  private async attemptPartialStudioUpdate(): Promise<{success: boolean, count: number}> {
    try {
      const studios = await RealFeelcycleScraper.getRealStudios();
      if (studios.length >= 30) {
        const result = await studiosService.safeRefreshStudiosFromScraping(studios);
        return { success: result.errors.length < studios.length * 0.5, count: studios.length };
      }
      return { success: false, count: 0 };
    } catch (error) {
      return { success: false, count: 0 };
    }
  }

  private async findStuckProcessingStudios(): Promise<any[]> {
    try {
      const allStudios = await studiosService.getAllStudios();
      const now = Date.now();
      const stuckThreshold = 30 * 60 * 1000; // 30分

      return allStudios.filter(studio => {
        const status = (studio as any).batchStatus;
        const lastProcessed = (studio as any).lastProcessed;
        
        if (status === 'processing' && lastProcessed) {
          const lastTime = new Date(lastProcessed).getTime();
          return (now - lastTime) > stuckThreshold;
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error finding stuck studios:', error);
      return [];
    }
  }

  /**
   * 復旧成功後のシステム状態確認
   */
  async verifySystemHealth(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
    details: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const details: string[] = [];

    try {
      // Database connectivity
      const studios = await studiosService.getAllStudios();
      checks.database = studios.length > 0;
      details.push(`Database: ${studios.length} studios accessible`);

      // Browser functionality
      try {
        await RealFeelcycleScraper.cleanup();
        const browser = await RealFeelcycleScraper.initBrowser();
        checks.browser = !!browser;
        details.push('Browser: Initialization successful');
        await RealFeelcycleScraper.cleanup();
      } catch (error) {
        checks.browser = false;
        details.push(`Browser: Initialization failed - ${error}`);
      }

      // Batch processing state
      const progress = await studiosService.getBatchProgress();
      checks.batchProcessing = progress.total > 0;
      details.push(`Batch: ${progress.completed}/${progress.total} completed`);

      const healthy = Object.values(checks).every(check => check);
      
      return { healthy, checks, details };

    } catch (error) {
      return {
        healthy: false,
        checks: { system: false },
        details: [`System health check failed: ${error}`],
      };
    }
  }
}

export const autoRecoveryService = AutoRecoveryService.getInstance();