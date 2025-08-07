import { LessonAvailability, StudioInfo } from '../types';

/**
 * FEELCYCLE scraping service
 * 37 studios across Japan support
 */
export class FeelcycleScraper {
  
  /**
   * Get all FEELCYCLE studios (37 studios)
   */
  static getStudios(): StudioInfo[] {
    return [
      // Tokyo area
      { code: 'omotesando', name: '表参道', region: 'tokyo' },
      { code: 'ginza', name: '銀座', region: 'tokyo' },
      { code: 'roppongi', name: '六本木', region: 'tokyo' },
      { code: 'shibuya', name: '渋谷', region: 'tokyo' },
      { code: 'shinjuku', name: '新宿', region: 'tokyo' },
      { code: 'ikebukuro', name: '池袋', region: 'tokyo' },
      { code: 'ueno', name: '上野', region: 'tokyo' },
      { code: 'shinagawa', name: '品川', region: 'tokyo' },
      { code: 'odaiba', name: 'お台場', region: 'tokyo' },
      { code: 'kichijoji', name: '吉祥寺', region: 'tokyo' },
      { code: 'machida', name: '町田', region: 'tokyo' },
      { code: 'tachikawa', name: '立川', region: 'tokyo' },
      
      // Kanagawa
      { code: 'yokohama', name: '横浜', region: 'kanagawa' },
      { code: 'kawasaki', name: '川崎', region: 'kanagawa' },
      { code: 'fujisawa', name: '藤沢', region: 'kanagawa' },
      
      // Saitama
      { code: 'omiya', name: '大宮', region: 'saitama' },
      { code: 'ksg', name: '越谷', region: 'saitama' },
      
      // Chiba
      { code: 'kashiwa', name: '柏', region: 'chiba' },
      
      // Osaka area
      { code: 'umeda', name: '梅田', region: 'osaka' },
      { code: 'namba', name: 'なんば', region: 'osaka' },
      { code: 'tennoji', name: '天王寺', region: 'osaka' },
      { code: 'kyoboshi', name: '京橋', region: 'osaka' },
      
      // Kyoto
      { code: 'kyoto', name: '京都', region: 'kyoto' },
      
      // Hyogo
      { code: 'sannomiya', name: '三宮', region: 'hyogo' },
      
      // Aichi
      { code: 'nagoya-sakae', name: '名古屋栄', region: 'aichi' },
      { code: 'nagoya-kanayama', name: '名古屋金山', region: 'aichi' },
      
      // Fukuoka
      { code: 'tenjin', name: '天神', region: 'fukuoka' },
      
      // Hokkaido
      { code: 'sapporo', name: '札幌', region: 'hokkaido' },
      
      // Miyagi
      { code: 'sendai', name: '仙台', region: 'miyagi' },
      
      // Hiroshima
      { code: 'hiroshima', name: '広島', region: 'hiroshima' },
      
      // Okinawa
      { code: 'naha', name: '那覇', region: 'okinawa' },
      
      // Additional studios
      { code: 'shimbashi', name: '新橋', region: 'tokyo' },
      { code: 'akasaka', name: '赤坂', region: 'tokyo' },
      { code: 'nihonbashi', name: '日本橋', region: 'tokyo' },
      { code: 'kanda', name: '神田', region: 'tokyo' },
      { code: 'tsukiji', name: '築地', region: 'tokyo' },
      { code: 'takadanobaba', name: '高田馬場', region: 'tokyo' },
    ];
  }

  /**
   * Get available dates for a studio (next 14 days)
   */
  static async getAvailableDates(studioCode: string): Promise<string[]> {
    try {
      console.log(`Getting available dates for studio: ${studioCode}`);
      
      // TODO: Implement actual FEELCYCLE website scraping
      // For now, return next 14 days as stub
      const dates: string[] = [];
      const today = new Date();
      
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
      }
      
      return dates;
      
    } catch (error) {
      console.error(`Error getting available dates for ${studioCode}:`, error);
      throw error;
    }
  }

  /**
   * Search lessons for a specific studio and date
   */
  static async searchLessons(
    studioCode: string, 
    date: string,
    filters?: {
      program?: string;
      instructor?: string;
      timeRange?: { start: string; end: string };
    }
  ): Promise<LessonAvailability[]> {
    try {
      console.log(`Searching lessons for ${studioCode} on ${date}`, filters);
      
      // TODO: Implement actual FEELCYCLE website scraping
      // For now, return mock data
      const mockLessons: LessonAvailability[] = [
        {
          lessonId: `${studioCode}_${date}_1030_BSL1`,
          studio: studioCode,
          date,
          time: '10:30',
          instructor: 'YUKI',
          program: 'BSL House 1',
          availableSlots: null,
          totalSlots: null,
          isAvailable: false,
        },
        {
          lessonId: `${studioCode}_${date}_1200_BB1`,
          studio: studioCode,
          date,
          time: '12:00',
          instructor: 'MIKI',
          program: 'BB1 Beat',
          availableSlots: null,
          totalSlots: null,
          isAvailable: true,
        },
        {
          lessonId: `${studioCode}_${date}_1400_BSB`,
          studio: studioCode,
          date,
          time: '14:00',
          instructor: 'NANA',
          program: 'BSB Beats',
          availableSlots: null,
          totalSlots: null,
          isAvailable: false,
        },
        {
          lessonId: `${studioCode}_${date}_1930_BSL2`,
          studio: studioCode,
          date,
          time: '19:30',
          instructor: 'Shiori.I',
          program: 'BSL House 1',
          availableSlots: null,
          totalSlots: null,
          isAvailable: false,
        },
      ];

      // Apply filters
      let filteredLessons = mockLessons;
      
      if (filters?.program) {
        filteredLessons = filteredLessons.filter(lesson => 
          lesson.program.toLowerCase().includes(filters.program!.toLowerCase())
        );
      }
      
      if (filters?.instructor) {
        filteredLessons = filteredLessons.filter(lesson => 
          lesson.instructor.toLowerCase().includes(filters.instructor!.toLowerCase())
        );
      }
      
      if (filters?.timeRange) {
        filteredLessons = filteredLessons.filter(lesson => {
          const lessonTime = lesson.time;
          return lessonTime >= filters.timeRange!.start && lessonTime <= filters.timeRange!.end;
        });
      }
      
      return filteredLessons;
      
    } catch (error) {
      console.error(`Error searching lessons for ${studioCode} on ${date}:`, error);
      throw error;
    }
  }

  /**
   * Check specific lesson availability (for monitoring)
   */
  static async checkLessonAvailability(
    studioCode: string,
    date: string,
    time: string,
    lessonName: string,
    instructor: string
  ): Promise<LessonAvailability | null> {
    try {
      console.log(`Checking availability: ${studioCode} ${date} ${time} ${lessonName} ${instructor}`);
      
      // TODO: Implement actual FEELCYCLE website scraping
      // For now, return mock data with random availability
      const hasAvailability = Math.random() > 0.7;
      const availableSlots = null; // No real seat data available
      
      return {
        lessonId: `${studioCode}_${date}_${time.replace(':', '')}_${lessonName.replace(' ', '')}`,
        studio: studioCode,
        date,
        time,
        instructor,
        program: lessonName,
        availableSlots,
        totalSlots: null,
        isAvailable: hasAvailability,
      };
      
    } catch (error) {
      console.error(`Error checking lesson availability:`, error);
      return null;
    }
  }

  /**
   * Get studio information by code
   */
  static getStudioInfo(studioCode: string): StudioInfo | null {
    const studios = this.getStudios();
    return studios.find(studio => studio.code === studioCode) || null;
  }

  /**
   * Get studios by region
   */
  static getStudiosByRegion(region: string): StudioInfo[] {
    const studios = this.getStudios();
    return studios.filter(studio => studio.region === region);
  }

  /**
   * Get all available regions
   */
  static getRegions(): string[] {
    const studios = this.getStudios();
    const regions = new Set(studios.map(studio => studio.region));
    return Array.from(regions).sort();
  }
}

export const feelcycleScraper = new FeelcycleScraper();