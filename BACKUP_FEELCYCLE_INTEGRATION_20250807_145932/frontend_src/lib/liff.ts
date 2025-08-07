import liff from '@line/liff';
import { LiffUser, LiffProfile } from '@/types/liff';

// 旧アプリと同じシンプルな初期化関数
export const initLiff = async () => {
  if (typeof window === "undefined") {
    console.log('❌ STEP 1: Window undefined');
    return null;
  }
  
  console.log('✅ STEP 1: Window check passed');
  
  try {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2007687052-B9Pqw7Zy';
    
    console.log('✅ STEP 2: Environment check');
    console.log('LIFF ID:', liffId);
    console.log('Process env LIFF ID:', process.env.NEXT_PUBLIC_LIFF_ID);
    
    if (!liffId) {
      console.log('❌ STEP 3: LIFF ID not found');
      return null;
    }
    
    console.log('✅ STEP 3: LIFF ID found');
    
    try {
      console.log('🔄 STEP 4: Starting liff.init()...');
      await liff.init({ liffId });
      console.log('✅ STEP 4: liff.init() successful');
    } catch (initError) {
      console.log('❌ STEP 4: liff.init() failed');
      console.error('Init error:', initError);
      throw initError;
    }
    
    console.log('✅ STEP 5: Checking LIFF status');
    console.log('isInClient:', liff.isInClient());
    console.log('isLoggedIn:', liff.isLoggedIn());

    // ブラウザ (LINE 外) でアクセスした場合のみログインリダイレクト
    if (!liff.isInClient() && !liff.isLoggedIn()) {
      console.log('🔄 STEP 6: Redirecting to LINE login...');
      liff.login();
      return null; // 外部ブラウザはここで LINE ログインへ遷移
    }

    try {
      console.log('🔄 STEP 7: Getting user profile...');
      const { userId } = await liff.getProfile();
      console.log('✅ STEP 7: Profile retrieved');
      console.log('User ID:', userId);
      return userId;
    } catch (profileError) {
      console.log('❌ STEP 7: Profile retrieval failed');
      console.error('Profile error:', profileError);
      throw profileError;
    }

  } catch (e) {
    console.log('❌ GENERAL ERROR in initLiff');
    console.error("Error details:", {
      name: e?.name,
      message: e?.message,
      stack: e?.stack
    });
    return null;
  }
};

class LiffService {
  private initialized = false;
  private readonly liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2007687052-B9Pqw7Zy';

  async init(): Promise<void> {
    if (typeof window === "undefined") return;
    
    if (!this.liffId) {
      throw new Error('LIFF ID is not configured');
    }

    try {
      await liff.init({ liffId: this.liffId });
      this.initialized = true;
    } catch (error) {
      console.error('LIFF initialization failed:', error);
      throw error;
    }
  }

  isLoggedIn(): boolean {
    return liff.isLoggedIn();
  }

  async login(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.isLoggedIn()) {
      liff.login();
    }
  }

  logout(): void {
    liff.logout();
  }

  async getProfile(): Promise<LiffUser> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.isLoggedIn()) {
      throw new Error('User is not logged in');
    }

    try {
      const profile: LiffProfile = await liff.getProfile();
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      };
    } catch (error) {
      console.error('Failed to get LIFF profile:', error);
      throw error;
    }
  }

  getAccessToken(): string | null {
    if (!this.isLoggedIn()) {
      return null;
    }
    return liff.getAccessToken();
  }

  async getIDToken(): Promise<string | null> {
    if (!this.isLoggedIn()) {
      return null;
    }
    
    try {
      return await liff.getIDToken();
    } catch (error) {
      console.error('Failed to get ID token:', error);
      return null;
    }
  }

  isInClient(): boolean {
    return liff.isInClient();
  }

  closeWindow(): void {
    if (this.isInClient()) {
      liff.closeWindow();
    }
  }

  openWindow(url: string, external = false): void {
    liff.openWindow({
      url,
      external,
    });
  }

  ready(): Promise<void> {
    return liff.ready;
  }
}

export const liffService = new LiffService();