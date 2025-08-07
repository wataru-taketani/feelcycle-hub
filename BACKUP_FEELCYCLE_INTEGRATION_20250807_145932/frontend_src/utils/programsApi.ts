import axios from 'axios';

interface ProgramData {
  programCode: string;
  programName: string;
  genre: string;
  backgroundColor: string;
  textColor: string;
}

// プログラム色情報のキャッシュ
let programsCache: Map<string, ProgramData> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export async function fetchProgramsData(): Promise<Map<string, ProgramData>> {
  const now = Date.now();
  
  // キャッシュが有効な場合はそれを返す
  if (programsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return programsCache;
  }

  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
    const response = await axios.get(`${apiBaseUrl}/programs`);
    
    if (response.data.success && response.data.data) {
      const programs = response.data.data as ProgramData[];
      programsCache = new Map();
      
      programs.forEach(program => {
        // programCodeで検索できるようにする（大文字小文字を無視）
        programsCache!.set(program.programCode.toUpperCase(), program);
      });
      
      lastFetchTime = now;
      console.log('Programs data loaded:', programs.length, 'programs');
      return programsCache;
    } else {
      throw new Error('Failed to fetch programs data');
    }
  } catch (error) {
    console.error('Error fetching programs data:', error);
    
    // エラー時はフォールバック用の空のMapを返す
    if (!programsCache) {
      programsCache = new Map();
    }
    return programsCache;
  }
}

export function getProgramColors(programCode: string): { backgroundColor: string; textColor: string } {
  if (!programsCache) {
    // キャッシュがない場合はデフォルト色を返す
    return getDefaultProgramColors(programCode);
  }

  const program = programsCache.get(programCode.toUpperCase());
  if (program) {
    return {
      backgroundColor: program.backgroundColor,
      textColor: program.textColor
    };
  }

  // データベースにない場合はデフォルト色を返す
  return getDefaultProgramColors(programCode);
}

// フォールバック用のデフォルト色定義
function getDefaultProgramColors(programCode: string): { backgroundColor: string; textColor: string } {
  switch (programCode.toUpperCase()) {
    case 'BB1': return { backgroundColor: 'rgb(255, 255, 102)', textColor: 'rgb(0, 0, 0)' };
    case 'BB2': return { backgroundColor: 'rgb(255, 153, 51)', textColor: 'rgb(0, 0, 0)' };
    case 'BB3': return { backgroundColor: 'rgb(255, 51, 0)', textColor: 'rgb(0, 0, 0)' };
    case 'BSL': return { backgroundColor: 'rgb(0, 0, 204)', textColor: 'rgb(255, 255, 255)' };
    case 'BSB': return { backgroundColor: 'rgb(0, 204, 255)', textColor: 'rgb(0, 0, 0)' };
    case 'BSW': return { backgroundColor: 'rgb(204, 102, 255)', textColor: 'rgb(255, 255, 255)' };
    case 'BSWI': return { backgroundColor: 'rgb(153, 0, 153)', textColor: 'rgb(255, 255, 102)' };
    case 'BSBI': return { backgroundColor: 'rgb(51, 102, 153)', textColor: 'rgb(255, 255, 102)' };
    default: return { backgroundColor: '#f3f4f6', textColor: '#374151' };
  }
}