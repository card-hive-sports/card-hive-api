import { User } from '@card-hive/shared-database';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

export interface AuthVerificationResponse {
  message: string;
  sessionID?: string;
}
