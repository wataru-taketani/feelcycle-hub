"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLambdaModules = debugLambdaModules;
async function debugLambdaModules(event) {
    console.log('🔍 Lambda Layer モジュール解決デバッグ開始');
    const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            nodePath: process.env.NODE_PATH || 'undefined'
        },
        paths: {},
        moduleTests: {}
    };
    try {
        // 1. パス確認
        const fs = require('fs');
        const layerPaths = [
            '/opt/nodejs/node_modules',
            '/opt/node_modules',
            process.cwd() + '/node_modules'
        ];
        console.log('📍 パス確認:');
        for (const layerPath of layerPaths) {
            try {
                const exists = fs.existsSync(layerPath);
                debugInfo.paths[layerPath] = { exists };
                console.log(`${exists ? '✅' : '❌'} ${layerPath}: ${exists ? '存在' : '存在しない'}`);
                if (exists) {
                    const contents = fs.readdirSync(layerPath);
                    debugInfo.paths[layerPath].contents = contents.slice(0, 20);
                    console.log(`  📁 内容数: ${contents.length}個`);
                    // puppeteer-core の詳細確認
                    const puppeteerPath = layerPath + '/puppeteer-core';
                    if (fs.existsSync(puppeteerPath)) {
                        console.log(`  ✅ puppeteer-core 発見: ${puppeteerPath}`);
                        const puppeteerContents = fs.readdirSync(puppeteerPath);
                        debugInfo.paths[layerPath].puppeteerContents = puppeteerContents;
                    }
                    // @sparticuz/chromium の詳細確認
                    const chromiumPath = layerPath + '/@sparticuz';
                    if (fs.existsSync(chromiumPath)) {
                        console.log(`  ✅ @sparticuz ディレクトリ発見: ${chromiumPath}`);
                        const chromiumContents = fs.readdirSync(chromiumPath);
                        debugInfo.paths[layerPath].chromiumContents = chromiumContents;
                    }
                }
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                debugInfo.paths[layerPath] = { error: errorMessage };
                console.log(`❌ ${layerPath}: ${errorMessage}`);
            }
        }
        // 2. require.resolve テスト
        console.log('\n📍 require.resolve テスト:');
        const testModules = ['puppeteer-core', '@sparticuz/chromium'];
        for (const moduleName of testModules) {
            try {
                const resolvedPath = require.resolve(moduleName);
                debugInfo.moduleTests[moduleName] = {
                    resolved: true,
                    path: resolvedPath
                };
                console.log(`✅ ${moduleName}: ${resolvedPath}`);
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                debugInfo.moduleTests[moduleName] = {
                    resolved: false,
                    error: errorMessage
                };
                console.log(`❌ ${moduleName}: ${errorMessage}`);
            }
        }
        // 3. 直接パス指定でのrequireテスト
        console.log('\n📍 直接パス require テスト:');
        const directPaths = [
            '/opt/nodejs/node_modules/puppeteer-core',
            '/opt/nodejs/node_modules/@sparticuz/chromium'
        ];
        for (const directPath of directPaths) {
            try {
                if (fs.existsSync(directPath)) {
                    const moduleExports = require(directPath);
                    debugInfo.moduleTests[`direct_${directPath}`] = {
                        success: true,
                        hasDefault: !!moduleExports.default,
                        keys: Object.keys(moduleExports).slice(0, 10)
                    };
                    console.log(`✅ 直接ロード成功: ${directPath}`);
                }
                else {
                    debugInfo.moduleTests[`direct_${directPath}`] = {
                        success: false,
                        reason: 'path_not_found'
                    };
                    console.log(`❌ パスが存在しない: ${directPath}`);
                }
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                debugInfo.moduleTests[`direct_${directPath}`] = {
                    success: false,
                    error: errorMessage
                };
                console.log(`❌ 直接ロードエラー ${directPath}: ${errorMessage}`);
            }
        }
        console.log('🎯 Lambda モジュール解決デバッグ完了');
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            body: JSON.stringify({
                success: true,
                debugInfo,
                summary: 'Lambda module resolution debug completed'
            }, null, 2)
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ デバッグエラー:', errorMessage);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                debugInfo
            })
        };
    }
}
