import puppeteer from 'puppeteer-core';
const chromium = require('@sparticuz/chromium').default;
import { LessonData } from '../types';
import { getJSTISOString, getTTLFromJST, logJSTInfo } from '../utils/dateUtils';

/**
 * Enhanced FEELCYCLE Scraper
 * JavaScript SPA読み込み待機とフォールバック機能強化
 */
export class EnhancedRealFeelcycleScraper {
  private static browser: any = null;

  /**
   * Initialize browser with enhanced configuration
   */
  static async initBrowser() {
    if (!this.browser) {
      const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
      
      if (isLambda) {
        console.log('🌐 Enhanced browser initialization for Lambda environment...');
        
        try {
          const executablePath = await chromium.executablePath();
          console.log('📍 Chromium executable path:', executablePath);
          
          // Enhanced Lambda configuration with extended timeouts
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
              '--hide-crash-restore-bubble',
              // SPA対応の追加設定
              '--disable-background-networking',
              '--disable-default-apps',
              '--disable-extensions-http-throttling',
              '--aggressive-cache-discard'
            ],
            defaultViewport: { width: 1280, height: 720 },
            executablePath,
            headless: true,
            timeout: 90000,  // 60s -> 90s
            protocolTimeout: 90000,  // 60s -> 90s
            pipe: false
          });
          
          console.log('✅ Enhanced browser initialized for Lambda');
          
        } catch (error) {
          console.error('❌ Enhanced Lambda browser initialization failed:', error);
          throw new Error(`Enhanced Lambda browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log('🖥️  Enhanced browser initialization for local development...');
        
        try {
          const puppeteerLocal = await import('puppeteer');
          
          this.browser = await puppeteerLocal.default.launch({
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox', 
              '--disable-dev-shm-usage',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              // SPA対応設定
              '--disable-background-networking',
              '--aggressive-cache-discard'
            ],
            defaultViewport: { width: 1280, height: 720 },
            headless: true,
            timeout: 60000
          });
          
          console.log('✅ Enhanced browser initialized for local development');
          
        } catch (error) {
          console.error('❌ Enhanced local browser initialization failed:', error);
          throw new Error(`Enhanced local browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    return this.browser;
  }

  /**
   * Enhanced wait for Vue.js SPA content loading
   */
  static async waitForSPAContent(page: any, timeout: number = 30000): Promise<void> {
    console.log('⏳ Vue.js SPA コンテンツ読み込み待機...');
    
    try {
      // Strategy 1: Wait for Vue.js to complete initial rendering
      await page.waitForFunction(
        () => {
          // Check if Vue app is mounted and studios are loaded
          const studioElements = document.querySelectorAll('li.address_item.handle');
          return studioElements.length > 0;
        },
        { timeout, polling: 500 }
      );
      
      console.log('✅ Vue.js スタジオリスト読み込み完了');
      
    } catch (vueError) {
      console.log('⚠️  Vue.js待機タイムアウト、フォールバック戦略実行...');
      
      // Strategy 2: Progressive content loading detection
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const contentFound = await page.evaluate(() => {
          const studios = document.querySelectorAll('li.address_item.handle');
          const headerElements = document.querySelectorAll('.header-sc-list');
          return studios.length > 0 || headerElements.length > 0;
        });
        
        if (contentFound) {
          console.log(`✅ フォールバック成功: ${attempts + 1}回目の試行で読み込み完了`);
          break;
        }
        
        attempts++;
        console.log(`⏳ 読み込み待機 ${attempts}/${maxAttempts}...`);
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('SPA content loading timeout after fallback strategies');
      }
    }
  }

  /**
   * Enhanced multi-pattern selector with fallback
   */
  static async findElementsWithFallback(page: any, selectorPatterns: string[], description: string): Promise<any[]> {
    console.log(`🔍 マルチパターンセレクタ検索: ${description}`);
    
    for (let i = 0; i < selectorPatterns.length; i++) {
      const selector = selectorPatterns[i];
      console.log(`  試行 ${i + 1}/${selectorPatterns.length}: ${selector}`);
      
      try {
        const elements = await page.$$(selector);
        if (elements && elements.length > 0) {
          console.log(`  ✅ 成功: ${elements.length}個の要素を発見`);
          return elements;
        } else {
          console.log(`  ❌ 失敗: 0個の要素`);
        }
      } catch (error) {
        console.log(`  ❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`❌ 全パターン失敗: ${description}`);
    return [];
  }

  /**
   * Enhanced studio selection with multiple patterns
   */
  static async selectStudioEnhanced(page: any, studioCode: string): Promise<boolean> {
    console.log(`🎯 強化スタジオ選択: ${studioCode}`);
    
    // Multiple selector patterns for studio elements
    const studioSelectorPatterns = [
      'li.address_item.handle',  // Current pattern
      'li[class*="address_item"]',  // Partial match
      'li[class*="studio"]',  // Alternative pattern
      '.studio-item',  // Potential new pattern
      '[data-studio-code]'  // Data attribute pattern
    ];
    
    const studioElements = await this.findElementsWithFallback(
      page, 
      studioSelectorPatterns, 
      'スタジオ要素'
    );
    
    if (studioElements.length === 0) {
      throw new Error(`No studio elements found for selection patterns`);
    }
    
    // Try to find and click the target studio
    const studioSelected = await page.evaluate((targetCode: string) => {
      // Multiple patterns to find studio code
      const codeExtractorPatterns = [
        (el: Element) => {
          const codeEl = el.querySelector('.sub');
          if (codeEl) {
            const match = codeEl.textContent?.trim().match(/\(([^)]+)\)/);
            return match ? match[1].toLowerCase() : null;
          }
          return null;
        },
        (el: Element) => {
          return el.getAttribute('data-studio-code')?.toLowerCase() || null;
        },
        (el: Element) => {
          const text = el.textContent || '';
          const match = text.match(/\(([^)]+)\)/);
          return match ? match[1].toLowerCase() : null;
        }
      ];
      
      const studioElements = document.querySelectorAll('li.address_item.handle, li[class*="address_item"], li[class*="studio"]');
      
      for (const element of Array.from(studioElements)) {
        for (const extractor of codeExtractorPatterns) {
          const code = extractor(element);
          if (code === targetCode) {
            console.log(`Studio found with code: ${code}`);
            (element as HTMLElement).click();
            return true;
          }
        }
      }
      
      return false;
    }, studioCode);

    if (studioSelected) {
      console.log(`✅ スタジオ選択成功: ${studioCode}`);
      return true;
    } else {
      throw new Error(`Studio ${studioCode} not found with enhanced selection`);
    }
  }

  /**
   * Enhanced lesson extraction with multiple selector patterns
   */
  static async extractLessonsEnhanced(page: any, studioCode: string): Promise<{ dateMapping: any[], allLessons: any[], error?: string, patterns?: any }> {
    console.log(`📋 強化レッスン抽出: ${studioCode}`);
    
    const lessonData = await page.evaluate(() => {
      console.log('Starting enhanced lesson extraction...');
      
      // Multiple patterns for date elements
      const dateElementPatterns = [
        '.header-sc-list .content .days',  // Current pattern
        '.schedule-header__date-item',     // Gemini pattern
        '.date-selector .day',             // Alternative pattern
        '[class*="date"][class*="item"]',  // Flexible pattern
        '.calendar-day'                    // Generic pattern
      ];
      
      let dateElements: NodeListOf<Element> | null = null;
      let usedDatePattern = '';
      
      for (const pattern of dateElementPatterns) {
        const elements = document.querySelectorAll(pattern);
        if (elements && elements.length > 0) {
          dateElements = elements;
          usedDatePattern = pattern;
          console.log(`Date pattern found: ${pattern}, count: ${elements.length}`);
          break;
        }
      }
      
      if (!dateElements || dateElements.length === 0) {
        console.log('No date elements found with any pattern');
        return { dateMapping: [], allLessons: [], error: 'No date elements found' };
      }
      
      // Extract date mapping
      const dateMapping = Array.from(dateElements).map((el, index) => ({
        index,
        text: el.textContent?.trim() || '',
        pattern: usedDatePattern
      }));
      
      console.log(`Date mapping created: ${dateMapping.length} dates`);
      
      // Multiple patterns for main lesson container
      const containerPatterns = [
        '.sc_list.active',          // Current pattern
        '.schedule-body',           // Gemini pattern
        '.lesson-container',        // Alternative pattern
        '[class*="schedule"][class*="list"]',  // Flexible pattern
        '.schedule-content'         // Generic pattern
      ];
      
      let mainContainer: Element | null = null;
      let usedContainerPattern = '';
      
      for (const pattern of containerPatterns) {
        const container = document.querySelector(pattern);
        if (container) {
          mainContainer = container;
          usedContainerPattern = pattern;
          console.log(`Container pattern found: ${pattern}`);
          break;
        }
      }
      
      if (!mainContainer) {
        console.log('No main container found with any pattern');
        return { dateMapping, allLessons: [], error: 'No main container found' };
      }
      
      // Multiple patterns for content columns
      const columnPatterns = [
        ':scope > .content',           // Current pattern
        '.schedule-body__column',      // Gemini pattern
        '.day-column',                 // Alternative pattern
        '[class*="column"]',           // Flexible pattern
        '.date-lessons'                // Generic pattern
      ];
      
      let contentElements: NodeListOf<Element> | null = null;
      let usedColumnPattern = '';
      
      for (const pattern of columnPatterns) {
        const elements = mainContainer.querySelectorAll(pattern);
        if (elements && elements.length > 0) {
          contentElements = elements;
          usedColumnPattern = pattern;
          console.log(`Column pattern found: ${pattern}, count: ${elements.length}`);
          break;
        }
      }
      
      if (!contentElements || contentElements.length === 0) {
        console.log('No content elements found with any pattern');
        return { dateMapping, allLessons: [], error: 'No content elements found' };
      }
      
      const allLessons: any[] = [];
      
      // Extract lessons from each date column
      Array.from(contentElements).forEach((column, columnIndex) => {
        const dateInfo = dateMapping[columnIndex];
        if (!dateInfo) return;

        // Parse date text to get actual date
        const dateText = dateInfo.text;
        let actualDate = '';
        
        const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})/);
        if (dateMatch) {
          const month = parseInt(dateMatch[1]);
          const day = parseInt(dateMatch[2]);
          const currentYear = new Date().getFullYear();
          actualDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        // Multiple patterns for lesson elements
        const lessonPatterns = [
          '.lesson.overflow_hidden',    // Current pattern
          '.lesson-item',               // Gemini pattern  
          '.lesson',                    // Simple pattern
          '[class*="lesson"]',          // Flexible pattern
          '.class-item'                 // Alternative pattern
        ];
        
        let lessonElements: NodeListOf<Element> | null = null;
        let usedLessonPattern = '';
        
        for (const pattern of lessonPatterns) {
          const elements = column.querySelectorAll(pattern);
          if (elements && elements.length > 0) {
            lessonElements = elements;
            usedLessonPattern = pattern;
            console.log(`Lesson pattern found for column ${columnIndex}: ${pattern}, count: ${elements.length}`);
            break;
          }
        }
        
        if (!lessonElements) {
          console.log(`No lesson elements found for column ${columnIndex}`);
          return;
        }
        
        Array.from(lessonElements).forEach((element) => {
          // Multiple patterns for lesson details
          const timePatterns = ['.time', '.lesson-item__time', '.start-time', '[class*="time"]'];
          const namePatterns = ['.lesson_name', '.lesson-item__name', '.program-name', '[class*="name"]'];
          const instructorPatterns = ['.instructor', '.lesson-item__instructor', '.teacher', '[class*="instructor"]'];
          const statusPatterns = ['.status', '.availability', '.seats', '[class*="status"]'];
          
          const getElementByPatterns = (patterns: string[]) => {
            for (const pattern of patterns) {
              const el = element.querySelector(pattern);
              if (el) return el;
            }
            return null;
          };
          
          const timeElement = getElementByPatterns(timePatterns);
          const nameElement = getElementByPatterns(namePatterns);
          const instructorElement = getElementByPatterns(instructorPatterns);
          const statusElement = getElementByPatterns(statusPatterns);
          
          if (timeElement && nameElement && instructorElement) {
            const timeText = timeElement.textContent?.trim();
            const nameText = nameElement.textContent?.trim();
            const instructorText = instructorElement.textContent?.trim();
            const statusText = statusElement?.textContent?.trim();
            
            // Extract color information from lesson_name style attribute
            const nameStyle = (nameElement as HTMLElement).style;
            const backgroundColor = nameStyle.backgroundColor || '';
            const textColor = nameStyle.color || '';
            
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
                backgroundColor: backgroundColor || null,
                textColor: textColor || null,
                statusText: statusText || null,
                dateText: dateText,
                columnIndex,
                // Debugging info
                patterns: {
                  date: usedDatePattern,
                  container: usedContainerPattern,
                  column: usedColumnPattern,
                  lesson: usedLessonPattern
                }
              });
            }
          } else {
            console.log(`Missing required elements for lesson in column ${columnIndex}`);
          }
        });
      });
      
      console.log(`Enhanced extraction complete: ${allLessons.length} lessons found`);
      return { dateMapping, allLessons, patterns: { usedDatePattern, usedContainerPattern, usedColumnPattern } };
    });

    return lessonData;
  }

  /**
   * Enhanced main scraping method with comprehensive fallbacks
   */
  static async searchAllLessonsEnhanced(studioCode: string): Promise<LessonData[]> {
    let retryCount = 0;
    const maxRetries = 5;  // Increased from 2 to 5
    
    while (retryCount <= maxRetries) {
      let browser = null;
      let page = null;
      
      try {
        console.log(`🔄 Enhanced attempt ${retryCount + 1}/${maxRetries + 1}: Fetching all lesson data for ${studioCode}...`);
        
        // Initialize fresh browser instance for each retry
        if (retryCount > 0) {
          console.log('🔄 Retry detected, reinitializing browser...');
          await this.cleanup();
          
          // Progressive delay strategy
          const delays = [2000, 5000, 10000, 20000, 30000]; // 2s, 5s, 10s, 20s, 30s
          const delay = delays[retryCount - 1] || 30000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        browser = await this.initBrowser();
        page = await browser.newPage();
        
        // Enhanced page configuration
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setDefaultTimeout(30000);  // Increased from 15s
        await page.setDefaultNavigationTimeout(30000);  // Increased from 15s
      
        // Step 1: Enhanced navigation with SPA waiting
        console.log('📍 Step 1: Enhanced navigation to FEELCYCLE site...');
        await page.goto('https://m.feelcycle.com/reserve', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Step 2: Wait for SPA content (Vue.js)
        console.log('📍 Step 2: Enhanced SPA content loading...');
        await this.waitForSPAContent(page, 30000);
        
        // Step 3: Enhanced studio selection
        console.log('📍 Step 3: Enhanced studio selection...');
        await this.selectStudioEnhanced(page, studioCode);

        // Step 4: Wait for schedule to load with enhanced detection
        console.log('📍 Step 4: Enhanced schedule loading...');
        await new Promise(resolve => setTimeout(resolve, 8000));  // Increased from 6s
        
        // Wait for schedule elements with multiple patterns
        const scheduleWaitPatterns = [
          '.header-sc-list .content .days',
          '.schedule-header__date-item',
          '.date-selector .day'
        ];
        
        let scheduleLoaded = false;
        for (const pattern of scheduleWaitPatterns) {
          try {
            await page.waitForSelector(pattern, { timeout: 15000 });
            console.log(`✅ Schedule loaded with pattern: ${pattern}`);
            scheduleLoaded = true;
            break;
          } catch (error) {
            console.log(`❌ Schedule wait failed for pattern: ${pattern}`);
          }
        }
        
        if (!scheduleLoaded) {
          throw new Error('Schedule failed to load with any pattern');
        }

        // Step 5: Enhanced lesson extraction
        console.log('📍 Step 5: Enhanced lesson extraction...');
        const extractionResult = await this.extractLessonsEnhanced(page, studioCode);
        
        if (extractionResult.error) {
          throw new Error(`Lesson extraction failed: ${extractionResult.error}`);
        }
        
        const { dateMapping, allLessons } = extractionResult;
        console.log(`Found ${allLessons.length} total lessons for ${studioCode} across ${dateMapping.length} dates`);
        
        if (allLessons.length === 0) {
          throw new Error('No lessons found after extraction');
        }

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
          backgroundColor: lesson.backgroundColor || null,
          textColor: lesson.textColor || null,
          lastUpdated: getJSTISOString(),
          ttl: getTTLFromJST(7), // 7 days from JST
        }));

        console.log(`✅ Enhanced scraping successful: ${lessonData.length} lessons for ${studioCode}`);
        return lessonData;

      } catch (error) {
        console.error(`❌ Enhanced attempt ${retryCount + 1} failed for ${studioCode}:`, error);
        
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
          console.error(`❌ All enhanced ${maxRetries + 1} attempts failed for ${studioCode}`);
          throw new Error(`Enhanced scraping failed for ${studioCode} after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    throw new Error(`Enhanced scraping failed for ${studioCode} after retries`);
  }

  /**
   * Extract available slots from status text
   */
  private static extractAvailableSlots(statusText: string): number {
    const match = statusText.match(/残り(\d+)人/);
    return match ? parseInt(match[1]) : 5;
  }

  /**
   * Enhanced cleanup with comprehensive resource management
   */
  static async cleanup() {
    if (this.browser) {
      console.log('🧹 Enhanced browser cleanup...');
      try {
        // Close all pages first
        const pages = await this.browser.pages();
        await Promise.all(pages.map((page: any) => page.close().catch((e: any) => console.log('Page close error:', e))));
        
        // Close browser
        await this.browser.close();
        console.log('✅ Enhanced browser closed successfully');
      } catch (error) {
        console.error('⚠️  Enhanced browser cleanup error:', error);
        try {
          if (this.browser && this.browser.process) {
            this.browser.process().kill('SIGKILL');
          }
        } catch (killError) {
          console.error('Enhanced browser kill error:', killError);
        }
      } finally {
        this.browser = null;
      }
      
      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        console.log('🗑️  Enhanced garbage collection...');
        global.gc();
      }
    }
  }
}