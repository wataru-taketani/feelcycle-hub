import puppeteer from 'puppeteer';
import { LessonData } from '../types';

export class RealFeelcycleScraper {
  private static browser: any = null;

  /**
   * Initialize browser instance
   */
  static async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
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
          '--disable-renderer-backgrounding'
        ],
        timeout: 60000
      });
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
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      console.log(`Fetching all lesson data for ${studioCode} (all dates at once)...`);
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
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
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date().getTime() + 7 * 86400000) / 1000), // 7 days
      }));

      return lessonData;

    } catch (error) {
      console.error('Error fetching all real lessons:', error);
      throw error;
    } finally {
      await page.close();
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
   * Extract available slots from status text
   */
  private static extractAvailableSlots(statusText: string): number {
    const match = statusText.match(/残り(\d+)人/);
    return match ? parseInt(match[1]) : 5;
  }

  /**
   * Cleanup browser
   */
  static async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}