import { User } from '@card-hive/shared-database';

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
