"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const daily_data_refresh_1 = require("./scripts/daily-data-refresh");
/**
 * 日次データ更新のテスト（小規模版）
 * 新宿スタジオの3日間のみで動作確認
 */
class TestDailyRefresh extends daily_data_refresh_1.DailyDataRefresh {
    /**
     * テスト用に制限されたスタジオリストを返す
     */
    async getAllStudios() {
        console.log('📍 テスト用スタジオ情報の取得...');
        // 新宿スタジオのみでテスト
        const testStudios = [
            { code: 'sjk', name: 'FEELCYCLEの新宿' }
        ];
        console.log(`✅ テスト用に${testStudios.length}件のスタジオを設定`);
        testStudios.forEach((studio, index) => {
            console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
        });
        return testStudios;
    }
    /**
     * テスト用に制限された日程でデータ取得
     */
    async refreshAllData() {
        console.log('📍 テスト用データの取得・保存...');
        try {
            // テスト用スタジオを取得
            const studios = await this.getAllStudios();
            // 取得対象日程（今日から3日間のみ）
            const targetDays = 3;
            const dates = Array.from({ length: targetDays }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            });
            console.log(`\n📅 テスト対象日程: ${dates[0]} 〜 ${dates[dates.length - 1]} (${targetDays}日間)`);
            let totalLessons = 0;
            let successCount = 0;
            let errorCount = 0;
            // 各スタジオの各日程データを取得
            for (const studio of studios) {
                console.log(`\n🏢 ${studio.name} (${studio.code}) の処理開始...`);
                for (const date of dates) {
                    try {
                        console.log(`  📅 ${date} のデータ取得中...`);
                        const { RealFeelcycleScraper } = await Promise.resolve().then(() => __importStar(require('./services/real-scraper')));
                        const realLessons = await RealFeelcycleScraper.searchRealLessons(studio.code, date);
                        if (realLessons.length > 0) {
                            // DynamoDBに保存
                            for (const lesson of realLessons) {
                                await this.lessonsService.storeLessonData(lesson);
                            }
                            console.log(`    ✅ ${realLessons.length}件のレッスンを保存`);
                            totalLessons += realLessons.length;
                            successCount++;
                        }
                        else {
                            console.log(`    ℹ️  レッスンなし`);
                            successCount++;
                        }
                        // レート制限対策（2秒待機）
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    catch (error) {
                        console.error(`    ❌ ${date} のデータ取得エラー:`, error);
                        errorCount++;
                        // エラーが続く場合は少し長めに待機
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
            console.log(`\n📊 テスト処理完了サマリー:`);
            console.log(`  総レッスン数: ${totalLessons}件`);
            console.log(`  成功: ${successCount}件`);
            console.log(`  エラー: ${errorCount}件`);
            console.log(`  成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
        }
        catch (error) {
            console.error('❌ テストデータ更新エラー:', error);
            throw error;
        }
    }
}
// テスト実行
async function runTest() {
    console.log('🧪 日次データ更新テスト開始');
    console.log('='.repeat(50));
    const testRefresh = new TestDailyRefresh();
    try {
        await testRefresh.runDailyRefresh();
        console.log('\n✅ テスト完了');
    }
    catch (error) {
        console.error('\n❌ テスト失敗:', error);
    }
}
if (require.main === module) {
    runTest().catch(console.error);
}
