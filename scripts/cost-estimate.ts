#!/usr/bin/env tsx

/**
 * AWS コスト試算スクリプト
 * 月次運用コストを計算
 */

interface CostEstimate {
  service: string;
  usage: string;
  monthlyCost: number;
  notes?: string;
}

const estimates: CostEstimate[] = [
  {
    service: 'Lambda',
    usage: '100,000 requests/month, 256MB, 10s avg',
    monthlyCost: 0, // Free tier
    notes: '無料枠内'
  },
  {
    service: 'API Gateway',
    usage: '100,000 requests/month',
    monthlyCost: 0, // Free tier
    notes: '無料枠内'
  },
  {
    service: 'DynamoDB',
    usage: 'On-demand, 1GB storage, 100K RCU/WCU',
    monthlyCost: 25,
    notes: 'Read/Write操作メイン'
  },
  {
    service: 'CloudWatch Logs',
    usage: '1GB/month, 7日保持',
    monthlyCost: 50,
    notes: 'ログ保存コスト'
  },
  {
    service: 'Secrets Manager',
    usage: '5 secrets',
    monthlyCost: 200,
    notes: 'ユーザー資格情報保存'
  },
  {
    service: 'EventBridge',
    usage: '43,200 invocations/month (1分間隔)',
    monthlyCost: 0,
    notes: '無料枠内'
  }
];

function calculateTotal(): number {
  return estimates.reduce((total, item) => total + item.monthlyCost, 0);
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function generateReport(): void {
  console.log('# FEELCYCLE Hub - 月次コスト試算\n');
  
  console.log('| サービス | 使用量 | 月額コスト | 備考 |');
  console.log('|---------|--------|------------|------|');
  
  estimates.forEach(item => {
    console.log(`| ${item.service} | ${item.usage} | ${formatCurrency(item.monthlyCost)} | ${item.notes || ''} |`);
  });
  
  const total = calculateTotal();
  console.log(`\n**合計予想コスト: ${formatCurrency(total)}/月**`);
  
  const budget = 1000;
  const remaining = budget - total;
  
  if (remaining >= 0) {
    console.log(`✅ 予算内 (残り${formatCurrency(remaining)})`);
  } else {
    console.log(`⚠️ 予算超過 (${formatCurrency(Math.abs(remaining))}オーバー)`);
  }
  
  console.log('\n## 最適化案');
  console.log('- Secrets Manager → SSM Parameter Store (非機密設定)');
  console.log('- CloudWatch Logs → S3アーカイブ (長期保存)');
  console.log('- DynamoDB Reserved Capacity (安定利用時)');
}

// Main execution
generateReport();