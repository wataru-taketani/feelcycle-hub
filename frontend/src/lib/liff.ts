import liff from '@line/liff';
import { LiffUser, LiffProfile } from '@/types/liff';

class LiffService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      throw new Error('LIFF ID is not configured');
    }

    try {
      await liff.init({ liffId });
      this.initialized = true;
      console.log('LIFF initialized successfully');
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