export interface LiffUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LiffContext {
  type: 'utou' | 'room' | 'group' | 'square_chat';
  userId?: string;
  utouId?: string;
  roomId?: string;
  groupId?: string;
  squareChatId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: LiffUser | null;
  loading: boolean;
  error: string | null;
  apiUser?: ApiUser | null;
}

export interface ApiUser {
  userId: string;
  email: string;
  planType: string;
  lineUserId?: string;
  createdAt: string;
  updatedAt: string;
}