/**
 * Lambda環境のデバッグ情報を収集
 */
export async function debugLambdaEnvironment() {
  const debug = {
    architecture: process.arch,
    platform: process.platform,
    nodeVersion: process.version,
    environment: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'Lambda' : 'Local',
    awsRegion: process.env.AWS_REGION,
    
    // ChromiumのPATH確認
    chromiumPaths: [
      '/tmp/chromium',
      '/opt/chromium', 
      '/var/task/node_modules/@sparticuz/chromium/bin/'
    ].map(path => {
      try {
        const fs = require('fs');
        return {
          path,
          exists: fs.existsSync(path),
          isFile: fs.existsSync(path) ? fs.lstatSync(path).isFile() : false,
          permissions: fs.existsSync(path) ? fs.lstatSync(path).mode.toString(8) : 'N/A'
        };
      } catch (error) {
        return { path, error: error instanceof Error ? error.message : String(error) };
      }
    }),
    
    // @sparticuz/chromium設定確認
    chromiumConfig: (() => {
      try {
        const chromium = require('@sparticuz/chromium').default;
        return {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          headless: chromium.headless,
          executablePath: 'function'
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    })()
  };
  
  console.log('🔍 Lambda Environment Debug:', JSON.stringify(debug, null, 2));
  return debug;
}