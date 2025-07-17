#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Environment-based table names
const environment = process.env.ENVIRONMENT || 'dev';
const USERS_TABLE = `feelcycle-hub-users-${environment}`;
const RESERVATIONS_TABLE = `feelcycle-hub-reservations-${environment}`;
const LESSON_HISTORY_TABLE = `feelcycle-hub-lesson-history-${environment}`;
const WAITLIST_TABLE = `feelcycle-hub-waitlist-${environment}`;

async function checkTable(tableName: string, description: string) {
  console.log(`\n🔍 ${description} (${tableName})`);
  console.log('='.repeat(80));

  try {
    const result = await docClient.send(new ScanCommand({
      TableName: tableName,
      Limit: 10, // Limit to first 10 items for overview
    }));

    const items = result.Items || [];
    console.log(`📊 Total items scanned: ${items.length}`);
    console.log(`🔢 Scanned count: ${result.ScannedCount || 0}`);
    
    if (items.length > 0) {
      console.log('\n📋 Sample records:');
      items.forEach((item, index) => {
        console.log(`\n${index + 1}. ${JSON.stringify(item, null, 2)}`);
      });
    } else {
      console.log('❌ No items found in table');
    }

  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log('❌ Table does not exist');
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

async function checkWaitlistByStatus() {
  console.log(`\n🔍 Waitlist Status Breakdown`);
  console.log('='.repeat(80));

  const statuses = ['active', 'paused', 'expired', 'cancelled', 'completed'];
  
  for (const status of statuses) {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: WAITLIST_TABLE,
        IndexName: 'StatusLessonDateTimeIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
      }));

      const items = result.Items || [];
      console.log(`\n${getStatusIcon(status)} ${status.toUpperCase()}: ${items.length} items`);
      
      if (items.length > 0) {
        items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.studioName} ${item.lessonDate} ${item.startTime} ${item.lessonName} (${item.instructor})`);
        });
      }

    } catch (error: any) {
      console.error(`❌ Error checking ${status}: ${error.message}`);
    }
  }
}

async function checkActiveMonitoringTargets() {
  console.log(`\n🔍 Active Monitoring Targets (Next 1 Hour)`);
  console.log('='.repeat(80));

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: WAITLIST_TABLE,
      IndexName: 'StatusLessonDateTimeIndex',
      KeyConditionExpression: '#status = :status AND lessonDateTime BETWEEN :now AND :oneHourLater',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':now': now.toISOString(),
        ':oneHourLater': oneHourLater.toISOString(),
      },
    }));

    const items = result.Items || [];
    console.log(`\n⏰ Monitoring targets in next hour: ${items.length} items`);
    console.log(`🕐 Current time: ${now.toISOString()}`);
    console.log(`🕑 One hour later: ${oneHourLater.toISOString()}`);
    
    if (items.length > 0) {
      items.forEach((item, index) => {
        console.log(`\n  ${index + 1}. 📍 ${item.studioName}`);
        console.log(`     📅 ${item.lessonDate} ${item.startTime}-${item.endTime}`);
        console.log(`     🎵 ${item.lessonName} (${item.instructor})`);
        console.log(`     🕐 Lesson time: ${item.lessonDateTime}`);
        console.log(`     📝 Created: ${item.createdAt}`);
        console.log(`     🔔 Notifications: ${item.notificationHistory?.length || 0}`);
      });
    }

  } catch (error: any) {
    console.error(`❌ Error checking monitoring targets: ${error.message}`);
  }
}

async function checkRecentActivity() {
  console.log(`\n🔍 Recent Waitlist Activity (Last 24 Hours)`);
  console.log('='.repeat(80));

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const result = await docClient.send(new ScanCommand({
      TableName: WAITLIST_TABLE,
      FilterExpression: 'createdAt >= :yesterday',
      ExpressionAttributeValues: {
        ':yesterday': yesterday.toISOString(),
      },
    }));

    const items = result.Items || [];
    console.log(`\n📊 Items created in last 24 hours: ${items.length}`);
    
    if (items.length > 0) {
      // Group by status
      const statusGroups: Record<string, any[]> = {};
      items.forEach(item => {
        const status = item.status;
        if (!statusGroups[status]) {
          statusGroups[status] = [];
        }
        statusGroups[status].push(item);
      });

      Object.entries(statusGroups).forEach(([status, statusItems]) => {
        console.log(`\n  ${getStatusIcon(status)} ${status}: ${statusItems.length} items`);
        statusItems.forEach(item => {
          console.log(`    - ${item.studioName} ${item.lessonDate} ${item.startTime} ${item.lessonName}`);
        });
      });
    }

  } catch (error: any) {
    console.error(`❌ Error checking recent activity: ${error.message}`);
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'active': return '🔍';
    case 'paused': return '⏸️';
    case 'expired': return '⏰';
    case 'cancelled': return '❌';
    case 'completed': return '✅';
    default: return '❓';
  }
}

async function main() {
  console.log('🚴‍♀️ FEELCYCLE Hub - DynamoDB Data Checker');
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🕐 Check time: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Check all tables
  await checkTable(USERS_TABLE, 'Users Table');
  await checkTable(RESERVATIONS_TABLE, 'Reservations Table');
  await checkTable(LESSON_HISTORY_TABLE, 'Lesson History Table');
  await checkTable(WAITLIST_TABLE, 'Waitlist Table');

  // Detailed waitlist analysis
  await checkWaitlistByStatus();
  await checkActiveMonitoringTargets();
  await checkRecentActivity();

  console.log('\n✅ DynamoDB check completed!');
}

// Run the checker
main().catch(console.error);