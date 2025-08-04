import { studiosService } from './src/services/studios-service';

/**
 * 現在のバッチ処理状況を確認するスクリプト
 */
async function checkBatchStatus() {
    console.log('=== FEELCYCLE スタジオバッチ処理状況 ===\n');
    
    try {
        // Step 1: 全体の進捗状況を取得
        console.log('📊 Step 1: バッチ処理の全体状況');
        const progress = await studiosService.getBatchProgress();
        
        console.log('全体進捗:');
        console.log(`  総スタジオ数: ${progress.total}`);
        console.log(`  完了: ${progress.completed}`);
        console.log(`  処理中: ${progress.processing}`);
        console.log(`  失敗: ${progress.failed}`);
        console.log(`  残り: ${progress.remaining}`);
        console.log('');
        
        // Step 2: 全スタジオの詳細状況を取得
        console.log('🏢 Step 2: 各スタジオの詳細状況');
        const allStudios = await studiosService.getAllStudios();
        
        // ステータス別にグループ化
        const studiosByStatus = allStudios.reduce((acc, studio) => {
            const status = (studio as any).batchStatus || 'pending';
            if (!acc[status]) {
                acc[status] = [];
            }
            acc[status].push(studio);
            return acc;
        }, {} as Record<string, typeof allStudios>);
        
        // ステータス別に表示
        Object.entries(studiosByStatus).forEach(([status, studios]) => {
            console.log(`\n${getStatusEmoji(status)} ${status.toUpperCase()} (${studios.length}件):`);
            studios.forEach(studio => {
                const studioData = studio as any;
                const lastError = studioData.lastError ? ` - エラー: ${studioData.lastError}` : '';
                const retryCount = studioData.retryCount ? ` (再試行: ${studioData.retryCount}回)` : '';
                const lastUpdated = studioData.lastUpdated ? ` - 更新: ${new Date(studioData.lastUpdated).toLocaleString('ja-JP')}` : '';
                
                console.log(`  • ${studio.studioName} (${studio.studioCode})${retryCount}${lastError}${lastUpdated}`);
            });
        });
        
        // Step 3: 特に横浜スタジオの状況を詳しく確認
        console.log('\n🎯 Step 3: 横浜スタジオ(YKH)の詳細状況');
        const yokohamaStudio = await studiosService.getStudioByCode('ykh');
        
        if (yokohamaStudio) {
            const yokohamaData = yokohamaStudio as any;
            console.log('横浜スタジオ詳細:');
            console.log(`  名前: ${yokohamaStudio.studioName}`);
            console.log(`  コード: ${yokohamaStudio.studioCode}`);
            console.log(`  地域: ${yokohamaStudio.region}`);
            console.log(`  最終更新: ${yokohamaStudio.lastUpdated}`);
            console.log(`  バッチステータス: ${yokohamaData.batchStatus || 'pending'}`);
            console.log(`  再試行回数: ${yokohamaData.retryCount || 0}`);
            console.log(`  最後のエラー: ${yokohamaData.lastError || 'なし'}`);
            console.log(`  最後のスクレイピング: ${yokohamaData.lastScrapedAt || '未実行'}`);
        } else {
            console.log('❌ 横浜スタジオがデータベースに見つかりません');
        }
        
        // Step 4: 次に処理されるスタジオを確認
        console.log('\n🔄 Step 4: 次に処理されるスタジオ');
        const nextStudio = await studiosService.getNextUnprocessedStudio();
        
        if (nextStudio) {
            console.log(`次の処理対象: ${nextStudio.studioName} (${nextStudio.studioCode})`);
        } else {
            console.log('✅ 処理待ちのスタジオはありません');
        }
        
        // Step 5: 失敗スタジオの詳細
        const failedStudios = studiosByStatus['failed'] || [];
        if (failedStudios.length > 0) {
            console.log('\n❌ 失敗したスタジオの詳細:');
            failedStudios.forEach(studio => {
                const studioData = studio as any;
                console.log(`\n  🏢 ${studio.studioName} (${studio.studioCode}):`);
                console.log(`     最後のエラー: ${studioData.lastError || '不明'}`);
                console.log(`     再試行回数: ${studioData.retryCount || 0}/2`);
                console.log(`     最終更新: ${studioData.lastUpdated ? new Date(studioData.lastUpdated).toLocaleString('ja-JP') : '未設定'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ バッチ状況確認中にエラーが発生:', error);
        throw error;
    }
}

function getStatusEmoji(status: string): string {
    switch (status) {
        case 'completed': return '✅';
        case 'processing': return '🔄';
        case 'failed': return '❌';
        case 'pending': return '⏳';
        default: return '❓';
    }
}

// メイン実行
checkBatchStatus()
    .then(() => {
        console.log('\n=== バッチ状況確認完了 ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('バッチ状況確認中に予期しないエラー:', error);
        process.exit(1);
    });