/**
 * FEELCYCLE 統合機能の型定義
 */

// API リクエスト・レスポンス型
export interface FEELCYCLEIntegrationRequest {
  userId: string;
  email: string;
  password: string;
}

export interface FEELCYCLEIntegrationResponse {
  success: boolean;
  data?: FEELCYCLEUserData;
  error?: string;
  details?: string;
}

export interface FEELCYCLEStatusResponse {
  success: boolean;
  isLinked: boolean;
  data?: FEELCYCLEUserData | null;
}

// ユーザーデータ型
export interface FEELCYCLEUserData {
  name: string;
  memberType: string;
  homeStudio: string;
  linkedAt: string;
  remainingLessons?: string;
  email?: string;
}

// 内部データ型（既存のfeeelcycle-auth-service.tsと互換性維持）
export interface FeelcycleCredentials {
  email: string;
  encryptedPassword: string;
  salt: string;
  iv: string;
  createdAt: string;
  lastUsed: string;
}

export interface FeelcycleUserData {
  userId: string;
  feelcycleEmail: string;
  lastUpdated: string;
  homeStudio: string;
  membershipType: string;
  currentReservations: ReservationItem[];
  lessonHistory: LessonHistoryItem[];
  dataScrapedAt: string;
  ttl: number;
}

export interface ReservationItem {
  date: string;
  time: string;
  studio: string;
  program: string;
  instructor: string;
}

export interface LessonHistoryItem {
  date: string;
  time: string;
  studio: string;
  program: string;
  instructor: string;
}

// フロントエンド用の型
export interface FEELCYCLEIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: FEELCYCLEUserData) => void;
  userId: string;
}

export interface FEELCYCLEStatusCardProps {
  data: FEELCYCLEUserData | null;
  onUnlink?: () => void;
}

// API エラー型
export interface FEELCYCLEAPIError {
  success: false;
  error: string;
  details?: string;
  statusCode?: number;
}

// 統合状態の型
export interface FEELCYCLEIntegrationState {
  isLinked: boolean;
  isLoading: boolean;
  data: FEELCYCLEUserData | null;
  error: string | null;
}

// フック用の型
export interface UseFEELCYCLEIntegrationReturn {
  state: FEELCYCLEIntegrationState;
  integrate: (email: string, password: string) => Promise<void>;
  checkStatus: () => Promise<void>;
  unlink: () => Promise<void>;
  reset: () => void;
}
