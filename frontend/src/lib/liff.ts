import liff from '@line/liff';
import { LiffUser, LiffProfile } from '@/types/liff';

class LiffService {
  private initialized = false;
  private readonly liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2007687052-qExN9w3O';

  async init(): Promise<void> {
    if (typeof window === "undefined") return;
    
    console.log('LIFF init starting with ID:', this.liffId);
    console.log('Current URL:', window.location.href);
    
    if (!this.liffId) {
      throw new Error('LIFF ID is not configured');
    }

    // リトライ機能付きの初期化
    const maxRetries = 3;
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`LIFF init attempt ${i + 1}/${maxRetries}`);
        
        // liff.init は複数回呼んでも問題ないためそのまま呼び出す
        await liff.init({ liffId: this.liffId });
        this.initialized = true;
        console.log('LIFF initialized successfully');
        console.log('isInClient:', liff.isInClient());
        console.log('isLoggedIn:', liff.isLoggedIn());
        return;
      } catch (error) {
        lastError = error;
        console.warn(`LIFF init attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries - 1) {
          console.log(`Retrying in ${(i + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
        }
      }
    }

    console.error('LIFF initialization failed after all retries:', lastError);
    console.error('Error details:', {
      name: lastError?.name,
      message: lastError?.message,
      stack: lastError?.stack
    });
    throw lastError;
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