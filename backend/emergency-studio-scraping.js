#!/usr/bin/env node

/**
 * 🚨 EMERGENCY MANUAL SCRAPING SCRIPT 🚨
 * For studios with ZERO lessons in database
 * Target studios: ftj, gif, kok, ksw, ktk, nmg, okbs, ske, uen, ykh, ysc
 * Priority: nmg (中目黒), ykh (横浜), sjk (新宿)
 */

const { RealFeelcycleScraper } = require('./dist/services/real-scraper.js');
const { LessonsService } = require('./dist/services/lessons-service.js');
const { logJSTInfo } = require('./dist/utils/dateUtils.js');

// Studios with ZERO lessons (critical data loss)
const CRITICAL_STUDIOS = [
  { code: 'nmg', name: '中目黒', priority: 1 },
  { code: 'ykh', name: '横浜', priority: 1 },
  { code: 'sjk', name: '新宿', priority: 1 },
  { code: 'ftj', name: '二子玉川', priority: 2 },
  { code: 'gif', name: '岐阜', priority: 2 },
  { code: 'kok', name: '国分寺', priority: 2 },
  { code: 'ksw', name: '川崎', priority: 2 },
  { code: 'ktk', name: '北千住', priority: 2 },
  { code: 'okbs', name: '大久保', priority: 2 },
  { code: 'ske', name: '栄', priority: 2 },
  { code: 'uen', name: '上野', priority: 2 },
  { code: 'ysc', name: '吉祥寺', priority: 2 }
];

async function emergencyStudioScraping() {
  console.log('🚨 EMERGENCY MANUAL SCRAPING - CRITICAL DATA LOSS FIX 🚨');
  logJSTInfo('Emergency Studio Scraping Start');
  
  const lessonService = new LessonsService();
  const startTime = Date.now();
  
  let totalLessons = 0;
  let successCount = 0;
  let failureCount = 0;
  const results = [];

  try {
    // Process studios by priority
    const priority1Studios = CRITICAL_STUDIOS.filter(s => s.priority === 1);
    const priority2Studios = CRITICAL_STUDIOS.filter(s => s.priority === 2);
    
    console.log(`\n🔥 PRIORITY 1 STUDIOS (${priority1Studios.length}): ${priority1Studios.map(s => s.name).join(', ')}`);
    console.log(`📋 Priority 2 Studios (${priority2Studios.length}): ${priority2Studios.map(s => s.name).join(', ')}`);
    
    // Process Priority 1 studios first
    for (const studio of priority1Studios) {
      const result = await processStudio(studio, lessonService);
      results.push(result);
      
      if (result.success) {
        successCount++;
        totalLessons += result.lessonCount;
        console.log(`✅ ${studio.name} (${studio.code}): ${result.lessonCount} lessons saved in ${result.duration.toFixed(1)}s`);
      } else {
        failureCount++;
        console.error(`❌ ${studio.name} (${studio.code}): ${result.error}`);
      }
      
      // Wait between studios to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎯 Priority 1 Complete: ${successCount}/${priority1Studios.length} studios successful`);
    
    // Process Priority 2 studios
    console.log(`\n📋 Processing Priority 2 Studios...`);
    for (const studio of priority2Studios) {
      const result = await processStudio(studio, lessonService);
      results.push(result);
      
      if (result.success) {
        successCount++;
        totalLessons += result.lessonCount;
        console.log(`✅ ${studio.name} (${studio.code}): ${result.lessonCount} lessons saved in ${result.duration.toFixed(1)}s`);
      } else {
        failureCount++;
        console.error(`❌ ${studio.name} (${studio.code}): ${result.error}`);
      }
      
      // Wait between studios
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 EMERGENCY SCRAPING COMPLETE!');
    logJSTInfo('Emergency Studio Scraping Completed');
    
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`• Total Execution Time: ${(totalDuration / 60).toFixed(1)} minutes`);
    console.log(`• Total Studios Processed: ${CRITICAL_STUDIOS.length}`);
    console.log(`• Successful: ${successCount}`);
    console.log(`• Failed: ${failureCount}`);
    console.log(`• Total Lessons Recovered: ${totalLessons}`);
    
    // Show detailed results
    console.log(`\n📋 Detailed Results:`);
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const details = result.success 
        ? `${result.lessonCount} lessons, ${result.duration.toFixed(1)}s`
        : `Error: ${result.error}`;
      console.log(`  ${status} ${result.studioName} (${result.studioCode}): ${details}`);
    });
    
    // Data verification for critical studios
    console.log(`\n🔍 Verification for Priority 1 Studios:`);
    for (const studio of priority1Studios) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const todayLessons = await lessonService.getLessonsForStudioAndDate(studio.code, today, {});
        console.log(`  ${studio.name} (${studio.code}): ${todayLessons.length} lessons today`);
      } catch (error) {
        console.error(`  ${studio.name} verification failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Emergency scraping failed:', error);
    logJSTInfo('Emergency Studio Scraping Failed');
    throw error;
  } finally {
    // Cleanup
    try {
      await RealFeelcycleScraper.cleanup();
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
    
    const finalTime = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️ Total Execution Time: ${(finalTime / 60).toFixed(1)} minutes`);
  }
}

async function processStudio(studio, lessonService) {
  const startTime = Date.now();
  
  try {
    console.log(`\n🏢 Processing ${studio.name} (${studio.code})...`);
    
    // Scrape all lessons for this studio
    const allLessons = await RealFeelcycleScraper.searchAllLessons(studio.code);
    
    if (allLessons.length > 0) {
      // Save to database
      await lessonService.storeLessonsData(allLessons);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Show date range
      const dates = [...new Set(allLessons.map(l => l.lessonDate))].sort();
      const dateRange = dates.length > 1 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : dates[0] || 'No dates';
      
      console.log(`  📅 Date range: ${dateRange} (${dates.length} days)`);
      
      return {
        studioCode: studio.code,
        studioName: studio.name,
        success: true,
        lessonCount: allLessons.length,
        duration,
        dateRange
      };
    } else {
      return {
        studioCode: studio.code,
        studioName: studio.name,
        success: false,
        error: 'No lessons found',
        lessonCount: 0,
        duration: (Date.now() - startTime) / 1000
      };
    }
    
  } catch (error) {
    return {
      studioCode: studio.code,
      studioName: studio.name,
      success: false,
      error: error.message,
      lessonCount: 0,
      duration: (Date.now() - startTime) / 1000
    };
  }
}

// Command line argument parsing
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚨 Emergency Studio Scraping Tool 🚨

Usage: node emergency-studio-scraping.js [options]

Options:
  --help, -h     Show this help message
  --priority-1   Only process priority 1 studios (nmg, ykh, sjk)
  
Studios with ZERO lessons:
Priority 1: nmg (中目黒), ykh (横浜), sjk (新宿)
Priority 2: ftj, gif, kok, ksw, ktk, okbs, ske, uen, ysc

This script will:
1. Scrape lesson data for studios with zero lessons
2. Save data directly to DynamoDB
3. Provide detailed progress and results
4. Verify data after completion
`);
  process.exit(0);
}

if (args.includes('--priority-1')) {
  // Filter to only priority 1 studios
  CRITICAL_STUDIOS.splice(0, CRITICAL_STUDIOS.length, ...CRITICAL_STUDIOS.filter(s => s.priority === 1));
  console.log('🎯 Processing PRIORITY 1 studios only');
}

// Execute the emergency scraping
emergencyStudioScraping()
  .then(() => {
    console.log('✅ Emergency scraping completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Emergency scraping failed:', error);
    process.exit(1);
  });