/**
 * FEELCYCLE認証サービスのセキュリティテスト
 * 
 * このファイルは防御的セキュリティ目的で作成され、
 * 脆弱性の検出と修正確認を行います。
 */

import * as crypto from 'crypto';

// テスト用の暗号化関数（実際のコードから抜粋）
function encryptPassword(password: string, salt?: string): { encryptedPassword: string; salt: string; iv: string } {
  const usedSalt = salt || crypto.randomBytes(32).toString('hex'); // 256-bit salt
  const iv = crypto.randomBytes(16); // 128-bit IV for AES
  
  // PBKDF2でキー導出 (100,000回反復)
  const key = crypto.pbkdf2Sync(password, usedSalt, 100000, 32, 'sha256');
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encryptedPassword: encrypted,
    salt: usedSalt,
    iv: iv.toString('hex')
  };
}

function decryptPassword(encryptedPassword: string, salt: string, iv: string, originalPassword: string): string {
  try {
    if (!encryptedPassword || !salt || !iv || !originalPassword) {
      throw new Error('Missing required decryption parameters');
    }
    
    // 元のパスワードを使ってキーを再生成
    const key = crypto.pbkdf2Sync(originalPassword, salt, 100000, 32, 'sha256');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Password decryption failed - credentials may be corrupted');
    throw new Error('Authentication credentials are invalid');
  }
}

/**
 * セキュリティテスト関数
 */
export function runSecurityTests(): { passed: number; failed: number; details: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  // テスト1: 暗号化の一貫性テスト
  try {
    const testPassword = 'testPassword123!';
    const encrypted = encryptPassword(testPassword);
    const decrypted = decryptPassword(encrypted.encryptedPassword, encrypted.salt, encrypted.iv, testPassword);
    
    if (decrypted === testPassword) {
      results.push('✅ Encryption/Decryption consistency test passed');
      passed++;
    } else {
      results.push('❌ Encryption/Decryption consistency test failed');
      failed++;
    }
  } catch (error) {
    results.push(`❌ Encryption test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // テスト2: ソルトのランダム性テスト
  try {
    const password = 'samePassword';
    const enc1 = encryptPassword(password);
    const enc2 = encryptPassword(password);
    
    if (enc1.salt !== enc2.salt && enc1.iv !== enc2.iv) {
      results.push('✅ Salt/IV uniqueness test passed');
      passed++;
    } else {
      results.push('❌ Salt/IV uniqueness test failed - not random enough');
      failed++;
    }
  } catch (error) {
    results.push(`❌ Salt uniqueness test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // テスト3: 不正な入力に対する堅牢性テスト
  try {
    // 空文字列
    const emptyTest = encryptPassword('');
    results.push('✅ Empty password encryption handled');
    
    // 非常に長いパスワード
    const longPassword = 'a'.repeat(10000);
    const longTest = encryptPassword(longPassword);
    results.push('✅ Long password encryption handled');
    
    passed += 2;
  } catch (error) {
    results.push(`❌ Input validation test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // テスト4: 改ざん検出テスト
  try {
    const password = 'testPassword';
    const encrypted = encryptPassword(password);
    
    // 暗号化されたデータを改ざん
    const tamperedData = encrypted.encryptedPassword.slice(0, -2) + '00';
    
    try {
      decryptPassword(tamperedData, encrypted.salt, encrypted.iv, password);
      results.push('❌ Tampering detection failed - should have thrown error');
      failed++;
    } catch (decryptError) {
      results.push('✅ Tampering detection test passed - corruption detected');
      passed++;
    }
  } catch (error) {
    results.push(`❌ Tampering detection test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // テスト5: キー強度テスト
  try {
    const password = 'testPassword';
    const encrypted = encryptPassword(password);
    
    // ソルトの長さチェック (32バイト = 64文字)
    if (encrypted.salt.length === 64) {
      results.push('✅ Salt length test passed (256-bit)');
      passed++;
    } else {
      results.push(`❌ Salt length test failed: ${encrypted.salt.length} chars (expected 64)`);
      failed++;
    }
    
    // IVの長さチェック (16バイト = 32文字)
    if (encrypted.iv.length === 32) {
      results.push('✅ IV length test passed (128-bit)');
      passed++;
    } else {
      results.push(`❌ IV length test failed: ${encrypted.iv.length} chars (expected 32)`);
      failed++;
    }
  } catch (error) {
    results.push(`❌ Key strength test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  return { passed, failed, details: results };
}

/**
 * レート制限テストのシミュレーション
 */
export function testRateLimiting(): { passed: number; failed: number; details: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  // シンプルなレート制限ロジックのテスト
  const authAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const maxAttempts = 5;
  const windowMs = 60 * 60 * 1000; // 1時間
  
  function simulateAuthAttempt(email: string): boolean {
    const attemptKey = email.toLowerCase();
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const attempts = authAttempts.get(attemptKey);
    if (attempts) {
      if (attempts.lastAttempt < windowStart) {
        authAttempts.delete(attemptKey);
      } else if (attempts.count >= maxAttempts) {
        return false; // Rate limited
      }
    }
    
    const currentAttempts = attempts || { count: 0, lastAttempt: 0 };
    currentAttempts.count += 1;
    currentAttempts.lastAttempt = now;
    authAttempts.set(attemptKey, currentAttempts);
    
    return true; // Allowed
  }

  try {
    const testEmail = 'test@example.com';
    
    // 最初の5回は許可されるべき
    for (let i = 1; i <= 5; i++) {
      if (simulateAuthAttempt(testEmail)) {
        results.push(`✅ Attempt ${i} allowed`);
        passed++;
      } else {
        results.push(`❌ Attempt ${i} should be allowed but was blocked`);
        failed++;
      }
    }
    
    // 6回目以降はブロックされるべき
    if (!simulateAuthAttempt(testEmail)) {
      results.push('✅ 6th attempt correctly blocked (rate limited)');
      passed++; 
    } else {
      results.push('❌ 6th attempt should be blocked but was allowed');
      failed++;
    }
    
  } catch (error) {
    results.push(`❌ Rate limiting test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  return { passed, failed, details: results };
}

// テスト実行関数
export function runAllSecurityTests(): void {
  console.log('🔒 Running FEELCYCLE Authentication Security Tests...\n');
  
  const cryptoTests = runSecurityTests();
  const rateLimitTests = testRateLimiting();
  
  console.log('📊 Cryptographic Security Tests:');
  cryptoTests.details.forEach(detail => console.log(`  ${detail}`));
  console.log(`  Summary: ${cryptoTests.passed} passed, ${cryptoTests.failed} failed\n`);
  
  console.log('⏱️ Rate Limiting Tests:');
  rateLimitTests.details.forEach(detail => console.log(`  ${detail}`));
  console.log(`  Summary: ${rateLimitTests.passed} passed, ${rateLimitTests.failed} failed\n`);
  
  const totalPassed = cryptoTests.passed + rateLimitTests.passed;
  const totalFailed = cryptoTests.failed + rateLimitTests.failed;
  
  console.log('🎯 Overall Security Test Results:');
  console.log(`  Total Tests: ${totalPassed + totalFailed}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  
  if (totalFailed === 0) {
    console.log('✅ All security tests passed!');
  } else {
    console.log('⚠️ Some security tests failed. Please review the implementation.');
  }
}

// テスト実行
if (require.main === module) {
  runAllSecurityTests();
}