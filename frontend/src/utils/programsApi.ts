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

export function getProgramColors(programCode: string, programName?: string): { backgroundColor: string; textColor: string } {
  if (!programsCache) {
    // キャッシュがない場合はデフォルト色を返す
    return getDefaultProgramColors(programCode, programName);
  }

  // BB1,BB2,BB3,BSW,BSWi,BSL,BSB,BSBi は programCode のみで判定
  const basicPrograms = ['BB1', 'BB2', 'BB3', 'BSW', 'BSWI', 'BSL', 'BSB', 'BSBI'];
  if (basicPrograms.includes(programCode.toUpperCase())) {
    const program = programsCache.get(programCode.toUpperCase());
    if (program) {
      return {
        backgroundColor: program.backgroundColor,
        textColor: program.textColor
      };
    }
  }

  // その他のプログラムは programName で詳細検索
  if (programName) {
    // programsCache から programName で一致するものを検索
    for (const [, program] of programsCache.entries()) {
      if (program.programName === programName) {
        return {
          backgroundColor: program.backgroundColor,
          textColor: program.textColor
        };
      }
    }
  }

  // 見つからない場合は programCode で検索
  const program = programsCache.get(programCode.toUpperCase());
  if (program) {
    return {
      backgroundColor: program.backgroundColor,
      textColor: program.textColor
    };
  }

  // データベースにない場合はデフォルト色を返す
  return getDefaultProgramColors(programCode, programName);
}

// フォールバック用のデフォルト色定義
function getDefaultProgramColors(programCode: string, programName?: string): { backgroundColor: string; textColor: string } {
  // programName による詳細色分け（EVENT, FEEL NOW など）
  if (programName) {
    // L 25 シリーズ
    if (programName.includes('L 25 FREE') || programName.includes('L 24 FREE')) {
      return { backgroundColor: 'rgb(0, 18, 28)', textColor: 'rgb(255, 51, 51)' };
    }
    if (programName.includes('L 25 FEEL') || programName.includes('L 24 FEEL')) {
      return { backgroundColor: 'rgb(0, 18, 28)', textColor: 'rgb(51, 153, 255)' };
    }
    if (programName.includes('L 25 BTM')) {
      return { backgroundColor: 'rgb(0, 18, 28)', textColor: 'rgb(189, 71, 220)' };
    }
    
    // FEEL NOW シリーズ
    if (programName.includes('FEEL NOW B')) {
      return { backgroundColor: 'rgb(0, 18, 28)', textColor: 'rgb(255, 255, 255)' };
    }
    if (programName.includes('FEEL NOW G')) {
      return { backgroundColor: 'rgb(213, 204, 127)', textColor: 'rgb(255, 255, 255)' };
    }
    if (programName.includes('FEEL NOW S')) {
      return { backgroundColor: 'rgb(192, 192, 192)', textColor: 'rgb(255, 255, 255)' };
    }
    
    // その他のEVENTレッスン
    if (programName.includes('FEEL HIGH') || programName.includes('FEEL DEEP')) {
      return { backgroundColor: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' };
    }
    if (programName.includes('BEERCYCLE')) {
      return { backgroundColor: 'rgb(122, 50, 2)', textColor: 'rgb(255, 255, 255)' };
    }
  }

  // programCode による基本色分け
  switch (programCode.toUpperCase()) {
    case 'BB1': return { backgroundColor: 'rgb(255, 255, 102)', textColor: 'rgb(0, 0, 0)' };
    case 'BB2': return { backgroundColor: 'rgb(255, 153, 51)', textColor: 'rgb(0, 0, 0)' };
    case 'BB3': return { backgroundColor: 'rgb(255, 51, 0)', textColor: 'rgb(0, 0, 0)' };
    case 'BSL': return { backgroundColor: 'rgb(0, 0, 204)', textColor: 'rgb(255, 255, 255)' };
    case 'BSB': return { backgroundColor: 'rgb(0, 204, 255)', textColor: 'rgb(0, 0, 0)' };
    case 'BSW': return { backgroundColor: 'rgb(204, 102, 255)', textColor: 'rgb(255, 255, 255)' };
    case 'BSWI': return { backgroundColor: 'rgb(153, 0, 153)', textColor: 'rgb(255, 255, 102)' };
    case 'BSBI': return { backgroundColor: 'rgb(51, 102, 153)', textColor: 'rgb(255, 255, 102)' };
    case 'EVENT': return { backgroundColor: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' };
    case 'FEEL NOW': return { backgroundColor: 'rgb(192, 192, 192)', textColor: 'rgb(255, 255, 255)' };
    case 'SKRILLEX': return { backgroundColor: 'rgb(255, 255, 255)', textColor: 'rgb(0, 0, 0)' };
    case 'OTHER': return { backgroundColor: 'rgb(102, 153, 204)', textColor: 'rgb(255, 255, 255)' };
    default: return { backgroundColor: '#f3f4f6', textColor: '#374151' };
  }
}