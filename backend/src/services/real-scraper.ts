import puppeteer from 'puppeteer-core';
const chromium = require('@sparticuz/chromium').default;
import { LessonData } from '../types';
import { getJSTISOString, getTTLFromJST, logJSTInfo } from '../utils/dateUtils';

export class RealFeelcycleScraper {
  private static browser: any = null;

  /**
   * Initialize browser instance
   */
  static async initBrowser() {
    if (!this.browser) {
      console.log('🌐 Initializing browser for Lambda environment...');
      
      try {
        // Get the Chromium executable path
        const executablePath = await chromium.executablePath();
        console.log('📍 Chromium executable path:', executablePath);
        
        // Lambda-optimized browser configuration
        this.browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=VizDisplayCompositor',
            '--disable-ipc-flooding-protection',
            '--disable-dev-tools',
            '--disable-default-apps',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--disable-web-security',
            '--enable-automation',
            '--password-store=basic',
            '--use-mock-keychain',
            '--hide-crash-restore-bubble'
          ],
          defaultViewport: { width: 1280, height: 720 },
          executablePath,
          headless: true,
          timeout: 60000,
          // Add protocol timeout to prevent Target.setDiscoverTargets error
          protocolTimeout: 60000,
          // Disable pipe for Lambda environment stability
          pipe: false
        });
        
        console.log('✅ Browser initialized successfully');
      } catch (error) {
        console.error('❌ Browser initialization failed:', error);
        throw new Error(`Browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return this.browser;
  }

  /**
   * Get all available studios from FEELCYCLE reservation website
   */
  static async getRealStudios(): Promise<Array<{code: string, name: string, region: string}>> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      console.log('Fetching real studio data from FEELCYCLE reservation site...');
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto('https://m.feelcycle.com/reserve', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Wait for the studio list to load
      await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract studio information from the reservation site
      const studios = await page.evaluate(() => {
        const studioElements = document.querySelectorAll('li.address_item.handle');
        const studios: Array<{code: string, name: string, region: string}> = [];
        
        studioElements.forEach(element => {
          const nameElement = element.querySelector('.main');
          const codeElement = element.querySelector('.sub');
          
          if (nameElement && codeElement) {
            const name = nameElement.textContent?.trim();
            const codeText = codeElement.textContent?.trim();
            
            if (name && codeText) {
              // Extract code from (CODE) format
              const codeMatch = codeText.match(/\(([^)]+)\)/);
              if (codeMatch) {
                const code = codeMatch[1].toLowerCase();
                studios.push({
                  code,
                  name,
                  region: 'unknown' // Will be determined by location
                });
              }
            }
          }
        });
        
        return studios;
      });

      console.log(`Found ${studios.length} studios from reservation site`);
      return studios;

    } catch (error) {
      console.error('Error fetching studios from reservation site:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Get all lessons for a specific studio (all dates at once)
   */
  static async searchAllLessons(studioCode: string): Promise<LessonData[]> {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      let browser = null;
      let page = null;
      
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries + 1}: Fetching all lesson data for ${studioCode} (all dates at once)...`);
        
        // Initialize fresh browser instance for each retry
        if (retryCount > 0) {
          console.log('🔄 Retry detected, reinitializing browser...');
          await this.cleanup();
        }
        
        browser = await this.initBrowser();
        page = await browser.newPage();
        
        // Set page configuration
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setDefaultTimeout(30000);
        await page.setDefaultNavigationTimeout(30000);
      
      // Step 1: Go to reservation site
      await page.goto('https://m.feelcycle.com/reserve', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // Wait for studio list to load
      await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Select studio (click on the matching studio)
      console.log(`Selecting studio ${studioCode}...`);
      const studioSelected = await page.evaluate((targetCode: string) => {
        const studioElements = document.querySelectorAll('li.address_item.handle');
        for (const element of studioElements) {
          const codeElement = element.querySelector('.sub');
          if (codeElement) {
            const codeText = codeElement.textContent?.trim();
            if (codeText) {
              const codeMatch = codeText.match(/\(([^)]+)\)/);
              if (codeMatch && codeMatch[1].toLowerCase() === targetCode) {
                (element as HTMLElement).click();
                return true;
              }
            }
          }
        }
        return false;
      }, studioCode);

      if (!studioSelected) {
        throw new Error(`Studio ${studioCode} not found`);
      }

      // Wait for schedule to load
      await new Promise(resolve => setTimeout(resolve, 6000));
      await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });

      // Step 3: Get all lessons for all dates at once
      console.log(`Extracting all lessons for all dates...`);
      
      const allLessonsData = await page.evaluate(() => {
        // 1. Get date mapping for all available dates
        const dateElements = document.querySelectorAll('.header-sc-list .content .days');
        const dateMapping = Array.from(dateElements).map((el, index) => ({
          index,
          text: el.textContent?.trim() || ''
        }));

        // 2. Get the main lesson container
        const scList = document.querySelector('.sc_list.active');
        if (!scList) {
          return { dateMapping, allLessons: [] };
        }

        const contentElements = scList.querySelectorAll(':scope > .content');
        const allLessons: any[] = [];

        // 3. Extract lessons from each date column
        contentElements.forEach((column, columnIndex) => {
          const dateInfo = dateMapping[columnIndex];
          if (!dateInfo) return;

          // Parse date text to get actual date
          const dateText = dateInfo.text;
          let actualDate = '';
          
          // Parse different date formats like "7/18(金)", "7/19(土)" etc.
          const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})/);
          if (dateMatch) {
            const month = parseInt(dateMatch[1]);
            const day = parseInt(dateMatch[2]);
            
            // Get current year - assume same year
            const currentYear = new Date().getFullYear();
            actualDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }

          const lessonElements = column.querySelectorAll('.lesson.overflow_hidden');
          
          lessonElements.forEach((element) => {
            const timeElement = element.querySelector('.time');
            const nameElement = element.querySelector('.lesson_name');
            const instructorElement = element.querySelector('.instructor');
            const statusElement = element.querySelector('.status');
            
            if (timeElement && nameElement && instructorElement) {
              const timeText = timeElement.textContent?.trim();
              const nameText = nameElement.textContent?.trim();
              const instructorText = instructorElement.textContent?.trim();
              const statusText = statusElement?.textContent?.trim();
              
              // Extract start and end time
              const timeMatch = timeText?.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
              if (timeMatch && nameText && instructorText && actualDate) {
                const startTime = timeMatch[1];
                const endTime = timeMatch[2];
                
                // Check availability
                const isAvailable = !element.classList.contains('seat-disabled');
                
                // Extract program type from lesson name
                const programMatch = nameText.match(/^(BSL|BB1|BB2|BB3|BSB|BSW|BSWi)/);
                const program = programMatch ? programMatch[1] : 'OTHER';
                
                allLessons.push({
                  date: actualDate,
                  startTime,
                  endTime,
                  lessonName: nameText,
                  instructor: instructorText,
                  isAvailable,
                  program,
                  statusText: statusText || null,
                  dateText: dateText,
                  columnIndex
                });
              }
            }
          });
        });
        
        return { dateMapping, allLessons };
      });

      const { dateMapping, allLessons } = allLessonsData;
      console.log(`Found ${allLessons.length} total lessons for ${studioCode} across ${dateMapping.length} dates`);

      // Convert to our LessonData format
      const lessonData: LessonData[] = allLessons.map((lesson: any) => ({
        studioCode,
        lessonDateTime: `${lesson.date}T${lesson.startTime}:00+09:00`,
        lessonDate: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        lessonName: lesson.lessonName,
        instructor: lesson.instructor,
        availableSlots: lesson.statusText ? this.extractAvailableSlots(lesson.statusText) : null,
        totalSlots: null,
        isAvailable: lesson.isAvailable ? 'true' : 'false',
        program: lesson.program,
        lastUpdated: getJSTISOString(),
        ttl: getTTLFromJST(7), // 7 days from JST
      }));

        console.log(`✅ Successfully fetched ${lessonData.length} lessons for ${studioCode}`);
        return lessonData;

      } catch (error) {
        console.error(`❌ Attempt ${retryCount + 1} failed for ${studioCode}:`, error);
        
        // Close page if it exists
        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            console.error('Error closing page:', closeError);
          }
        }
        
        retryCount++;
        
        if (retryCount > maxRetries) {
          console.error(`❌ All ${maxRetries + 1} attempts failed for ${studioCode}`);
          throw new Error(`Failed to fetch lessons for ${studioCode} after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait before retry
        const waitTime = retryCount * 2000; // 2s, 4s, etc.
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Search for lesson data for a specific studio and date (compatibility method)
   * This method now uses the optimized approach - gets all lessons and filters by date
   */
  static async searchRealLessons(studioCode: string, date: string): Promise<LessonData[]> {
    console.log(`Fetching lessons for ${studioCode} on ${date} using optimized approach...`);
    
    // Get all lessons for the studio
    const allLessons = await this.searchAllLessons(studioCode);
    
    // Filter lessons for the specific date
    const filteredLessons = allLessons.filter(lesson => lesson.lessonDate === date);
    
    console.log(`Found ${filteredLessons.length} lessons for ${studioCode} on ${date} (from ${allLessons.length} total)`);
    
    return filteredLessons;
  }

  /**
   * Search for lessons from all studios for a specific date
   */
  static async searchAllStudiosRealLessons(date: string): Promise<LessonData[]> {
    console.log(`🌏 Fetching lessons from ALL studios for ${date}...`);
    
    try {
      // First get all available studios
      const studios = await this.getRealStudios();
      console.log(`Found ${studios.length} studios to scrape`);
      
      const allLessons: LessonData[] = [];
      
      // Process studios in batches to avoid overwhelming the site
      const batchSize = 5;
      for (let i = 0; i < studios.length; i += batchSize) {
        const batch = studios.slice(i, i + batchSize);
        console.log(`Processing studio batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(studios.length/batchSize)}...`);
        
        const batchPromises = batch.map(async (studio) => {
          try {
            const lessons = await this.searchRealLessons(studio.code, date);
            console.log(`${studio.name}(${studio.code}): ${lessons.length} lessons`);
            return lessons;
          } catch (error) {
            console.error(`Error scraping ${studio.name}(${studio.code}):`, error);
            return [];
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(lessons => allLessons.push(...lessons));
        
        // Small delay between batches
        if (i + batchSize < studios.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Total lessons found across all studios: ${allLessons.length}`);
      return allLessons;
      
    } catch (error) {
      console.error('Error in searchAllStudiosRealLessons:', error);
      throw error;
    }
  }

  /**
   * Extract available slots from status text
   */
  private static extractAvailableSlots(statusText: string): number {
    const match = statusText.match(/残り(\d+)人/);
    return match ? parseInt(match[1]) : 5;
  }

  /**
   * Cleanup browser resources and force garbage collection
   */
  static async cleanup() {
    if (this.browser) {
      console.log('🧹 Cleaning up browser resources...');
      try {
        // Close all pages first
        const pages = await this.browser.pages();
        await Promise.all(pages.map(page => page.close().catch(e => console.log('Page close error:', e))));
        
        // Close browser
        await this.browser.close();
        console.log('✅ Browser closed successfully');
      } catch (error) {
        console.error('⚠️  Error during browser cleanup:', error);
        // Force process termination if browser is unresponsive
        try {
          if (this.browser && this.browser.process) {
            this.browser.process().kill('SIGKILL');
          }
        } catch (killError) {
          console.error('Error killing browser process:', killError);
        }
      } finally {
        this.browser = null;
      }
      
      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        console.log('🗑️  Running garbage collection...');
        global.gc();
      }
    }
  }
}