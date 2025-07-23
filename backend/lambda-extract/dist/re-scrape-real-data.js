"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const real_scraper_1 = require("./services/real-scraper");
const lessons_service_1 = require("./services/lessons-service");
async function rescrapeRealData() {
    console.log('🚴‍♀️ Re-scraping Real FEELCYCLE Data for Koshigaya - 2025-07-20');
    console.log('='.repeat(70));
    try {
        // Get real lesson data from FEELCYCLE website
        console.log('\n📋 Step 1: Fetching fresh real lesson data from FEELCYCLE...');
        const lessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons('ksg', '2025-07-20');
        console.log(`✅ Found ${lessons.length} real lessons`);
        if (lessons.length === 0) {
            console.log('❌ No lessons found, exiting...');
            return;
        }
        // Show sample of the data
        console.log('\n📋 Sample of real lesson data:');
        lessons.slice(0, 5).forEach((lesson, index) => {
            console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
            console.log(`     💺 ${lesson.availableSlots} slots, Status: ${lesson.isAvailable === 'true' ? 'Available' : 'Full'}`);
            console.log(`     🏷️ Program: ${lesson.program}`);
        });
        // Save to DynamoDB
        console.log('\n💾 Step 2: Saving lessons to DynamoDB...');
        for (let i = 0; i < lessons.length; i++) {
            const lesson = lessons[i];
            await lessons_service_1.lessonsService.storeLessonData(lesson);
            if ((i + 1) % 20 === 0) {
                console.log(`  Saved ${i + 1}/${lessons.length} lessons...`);
            }
        }
        console.log(`\n✅ Successfully saved ${lessons.length} real lessons to DynamoDB`);
        // Verify saved data
        console.log('\n🔍 Step 3: Verifying saved data...');
        const savedLessons = await lessons_service_1.lessonsService.getLessonsForStudioAndDate('ksg', '2025-07-20');
        console.log(`✅ Verification: Found ${savedLessons.length} lessons in database`);
        // Show summary
        if (savedLessons.length > 0) {
            const availableCount = savedLessons.filter(l => l.isAvailable === 'true').length;
            const fullCount = savedLessons.length - availableCount;
            console.log('\n📊 Final Summary:');
            console.log(`  Total lessons: ${savedLessons.length}`);
            console.log(`  Available: ${availableCount}`);
            console.log(`  Full: ${fullCount}`);
            // Count by program
            const programCounts = savedLessons.reduce((acc, lesson) => {
                acc[lesson.program] = (acc[lesson.program] || 0) + 1;
                return acc;
            }, {});
            console.log(`  Programs: ${Object.entries(programCounts).map(([program, count]) => `${program}: ${count}`).join(', ')}`);
            console.log('\n✅ SUCCESS: Real data from FEELCYCLE completely saved and verified');
        }
    }
    catch (error) {
        console.error('❌ Error during real data scraping:', error);
        throw error;
    }
    finally {
        // Cleanup
        await real_scraper_1.RealFeelcycleScraper.cleanup();
        console.log('\n🧹 Browser cleaned up');
    }
}
rescrapeRealData().catch(console.error);
