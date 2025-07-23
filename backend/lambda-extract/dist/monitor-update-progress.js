"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const LESSONS_TABLE_NAME = process.env.LESSONS_TABLE_NAME || 'feelcycle-hub-lessons-dev';
/**
 * DynamoDB更新進捗を監視
 */
class UpdateProgressMonitor {
    previousCount = 0;
    stableCount = 0;
    maxStableChecks = 5; // 5回連続で同じ件数なら完了と判定
    /**
     * 現在のレッスン数とスタジオ別統計を取得
     */
    async getCurrentStats() {
        try {
            // 総件数を取得
            const countResult = await docClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: LESSONS_TABLE_NAME,
                Select: 'COUNT'
            }));
            const totalCount = countResult.Count || 0;
            // スタジオ別統計を取得
            const allItemsResult = await docClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: LESSONS_TABLE_NAME,
                ProjectionExpression: 'studioCode, lessonDate, startTime, lessonName, instructor'
            }));
            const studioStats = {};
            const sampleLessons = [];
            if (allItemsResult.Items) {
                allItemsResult.Items.forEach(item => {
                    const studio = item.studioCode;
                    studioStats[studio] = (studioStats[studio] || 0) + 1;
                    // 最初の5件をサンプルとして保存
                    if (sampleLessons.length < 5) {
                        sampleLessons.push(item);
                    }
                });
            }
            return {
                totalCount,
                studioStats,
                sampleLessons
            };
        }
        catch (error) {
            console.error('統計取得エラー:', error);
            throw error;
        }
    }
    /**
     * 進捗状況を表示
     */
    async displayProgress() {
        const stats = await this.getCurrentStats();
        const currentTime = new Date().toLocaleTimeString('ja-JP');
        console.log(`\n📊 [${currentTime}] 更新進捗状況:`);
        console.log(`総レッスン数: ${stats.totalCount}件`);
        // 前回から変化があるかチェック
        if (stats.totalCount === this.previousCount) {
            this.stableCount++;
            console.log(`⏳ 同じ件数が${this.stableCount}回連続 (完了判定まで残り${this.maxStableChecks - this.stableCount}回)`);
        }
        else {
            this.stableCount = 0;
            const increase = stats.totalCount - this.previousCount;
            console.log(`📈 前回から+${increase}件増加`);
        }
        this.previousCount = stats.totalCount;
        // スタジオ別統計（上位10スタジオ）
        const topStudios = Object.entries(stats.studioStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        console.log('\n🏢 スタジオ別レッスン数 (上位10スタジオ):');
        topStudios.forEach(([studio, count], index) => {
            console.log(`  ${index + 1}. ${studio}: ${count}件`);
        });
        // サンプルレッスン
        console.log('\n📝 サンプルレッスン:');
        stats.sampleLessons.forEach((lesson, index) => {
            console.log(`  ${index + 1}. ${lesson.studioCode} ${lesson.lessonDate} ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
        });
        // 完了判定
        const isComplete = this.stableCount >= this.maxStableChecks;
        if (isComplete) {
            console.log('\n🎉 更新完了と判定されました！');
            console.log(`最終レッスン数: ${stats.totalCount}件`);
            console.log(`対象スタジオ数: ${Object.keys(stats.studioStats).length}スタジオ`);
        }
        return isComplete;
    }
    /**
     * 更新完了まで監視
     */
    async monitorUntilComplete() {
        console.log('🔍 DynamoDB更新進捗の監視を開始します...');
        console.log('='.repeat(60));
        let isComplete = false;
        let checkCount = 0;
        while (!isComplete) {
            checkCount++;
            console.log(`\n📍 チェック ${checkCount}回目:`);
            try {
                isComplete = await this.displayProgress();
                if (!isComplete) {
                    console.log('\n⏰ 30秒後に再チェックします...');
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            }
            catch (error) {
                console.error('監視エラー:', error);
                console.log('5秒後に再試行します...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log('\n✅ 監視完了！データ更新が完了しました。');
        console.log('スタジオと日付を指定して、正しいデータが格納されているかチェックできます。');
    }
}
// スクリプトとして実行された場合
if (require.main === module) {
    const monitor = new UpdateProgressMonitor();
    monitor.monitorUntilComplete().catch(console.error);
}
