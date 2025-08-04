const chromium = require('@sparticuz/chromium').default;
import puppeteer from 'puppeteer-core';

/**
 * Chromium実行問題の詳細診断
 */
async function diagnoseChromiumIssue() {
    console.log('=== Chromium実行問題詳細診断 ===\n');
    
    try {
        // Step 1: Chromium パッケージの基本情報確認
        console.log('📦 Step 1: @sparticuz/chromium パッケージ情報');
        console.log(`chromium version: ${chromium.version || 'unknown'}`);
        console.log(`chromium args: ${JSON.stringify(chromium.args.slice(0, 5))}... (${chromium.args.length} total)`);
        
        // Step 2: 実行可能ファイルパスの確認
        console.log('\n📍 Step 2: Chromium実行ファイル情報');
        const executablePath = await chromium.executablePath();
        console.log(`実行ファイルパス: ${executablePath}`);
        
        // Step 3: ファイルシステム権限確認
        console.log('\n📁 Step 3: ファイルシステム確認');
        const fs = require('fs');
        const path = require('path');
        
        try {
            const stats = fs.statSync(executablePath);
            console.log(`ファイル存在: ✅`);
            console.log(`ファイルサイズ: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
            console.log(`実行権限: ${stats.mode & parseInt('111', 8) ? '✅' : '❌'}`);
            console.log(`ファイル権限: ${stats.mode.toString(8)}`);
            
            // ディレクトリの権限も確認
            const dirPath = path.dirname(executablePath);
            const dirStats = fs.statSync(dirPath);
            console.log(`ディレクトリ権限: ${dirStats.mode.toString(8)}`);
            
        } catch (fsError) {
            console.log(`❌ ファイル確認エラー: ${fsError}`);
        }
        
        // Step 4: 環境情報確認
        console.log('\n🖥️  Step 4: 実行環境情報');
        console.log(`OS: ${process.platform}`);
        console.log(`アーキテクチャ: ${process.arch}`);
        console.log(`Node.js version: ${process.version}`);
        console.log(`実行ディレクトリ: ${process.cwd()}`);
        console.log(`一時ディレクトリ: ${require('os').tmpdir()}`);
        
        // Step 5: 権限修正の試行
        console.log('\n🔧 Step 5: 実行権限修正試行');
        try {
            fs.chmodSync(executablePath, 0o755);
            console.log('✅ 実行権限設定完了 (755)');
        } catch (chmodError) {
            console.log(`❌ 権限変更失敗: ${chmodError}`);
        }
        
        // Step 6: 直接実行テスト
        console.log('\n🚀 Step 6: Chromium直接実行テスト');
        const { spawn } = require('child_process');
        
        try {
            const testProcess = spawn(executablePath, ['--version'], { 
                stdio: 'pipe',
                timeout: 10000 
            });
            
            testProcess.stdout.on('data', (data: Buffer) => {
                console.log(`Chromium version output: ${data.toString().trim()}`);
            });
            
            testProcess.stderr.on('data', (data: Buffer) => {
                console.log(`Chromium stderr: ${data.toString().trim()}`);
            });
            
            await new Promise((resolve, reject) => {
                testProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Chromium直接実行成功');
                        resolve(code);
                    } else {
                        console.log(`❌ Chromium直接実行失敗 (exit code: ${code})`);
                        reject(new Error(`Exit code: ${code}`));
                    }
                });
                
                testProcess.on('error', (error) => {
                    console.log(`❌ Chromium実行エラー: ${error}`);
                    reject(error);
                });
            });
            
        } catch (execError) {
            console.log(`❌ 直接実行テスト失敗: ${execError}`);
        }
        
        // Step 7: Puppeteer起動テスト (権限修正後)
        console.log('\n🎭 Step 7: Puppeteer起動テスト (権限修正後)');
        try {
            const browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ],
                defaultViewport: { width: 1280, height: 720 },
                executablePath,
                headless: true,
                timeout: 30000
            });
            
            console.log('✅ Puppeteer起動成功');
            
            // ブラウザーバージョン取得
            const version = await browser.version();
            console.log(`ブラウザーバージョン: ${version}`);
            
            await browser.close();
            console.log('✅ ブラウザー正常終了');
            
        } catch (puppeteerError) {
            console.log(`❌ Puppeteer起動失敗: ${puppeteerError}`);
            
            // エラーの詳細分析
            if (puppeteerError instanceof Error) {
                if (puppeteerError.message.includes('ENOEXEC')) {
                    console.log('🔍 診断: 実行ファイル形式が不正またはアーキテクチャ不適合');
                } else if (puppeteerError.message.includes('EACCES')) {
                    console.log('🔍 診断: 実行権限不足');
                } else if (puppeteerError.message.includes('ENOENT')) {
                    console.log('🔍 診断: ファイルが見つからない');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ 診断プロセスでエラー:', error);
    }
}

// メイン実行
diagnoseChromiumIssue()
    .then(() => {
        console.log('\n=== 診断完了 ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('診断実行中に予期しないエラー:', error);
        process.exit(1);
    });