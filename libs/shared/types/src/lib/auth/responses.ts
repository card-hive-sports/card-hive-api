import { User, AuthProvider } from '@card-hive/shared-database';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

export interface AuthVerificationResponse {
  message: string;
  sessionID?: string;
}

export interface GoogleVerificationResponse {
  providerID: string;
  email: string;
  fullName: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LoginActivityResponse {
  id: string;
  userID: string;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  platform: string | null;
  browser: string | null;
  loginMethod: AuthProvider;
  success: boolean;
  failureReason: string | null;
}

export interface LoginActivitiesPaginatedResponse {
  data: LoginActivityResponse[];
  pagination: PaginationMeta;
}
