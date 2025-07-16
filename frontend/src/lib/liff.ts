import liff from '@line/liff';
import { LiffUser, LiffProfile } from '@/types/liff';

// 旧アプリと同じシンプルな初期化関数
export const initLiff = async () => {
  if (typeof window === "undefined") return null;
  try {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2007687052-qExN9w3O';
    
    if (!liffId) {
      console.warn("NEXT_PUBLIC_LIFF_ID is not set");
      return null;
    }
    
    console.log('LIFF init with ID:', liffId);
    
    // liff.init は複数回呼んでも問題ないためそのまま呼び出す
    await liff.init({ liffId });

    // ブラウザ (LINE 外) でアクセスした場合のみログインリダイレクト
    if (!liff.isInClient() && !liff.isLoggedIn()) {
      liff.login();
      return null; // 外部ブラウザはここで LINE ログインへ遷移
    }

    // LINE クライアント内では profile API で userId を取得
    const { userId } = await liff.getProfile();
    return userId;

  } catch (e) {
    console.error("LIFF init failed", e);
    return null;
  }
};

class LiffService {
  private initialized = false;
  private readonly liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2007687052-qExN9w3O';

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