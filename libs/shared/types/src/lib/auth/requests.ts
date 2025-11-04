export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface PhoneLoginRequest {
  phone: string;
}

export interface PhoneLoginVerifyRequest {
  phone: string;
  code: string;
  sessionID?: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface GoogleIDTokenRequest {
  idToken: string;
}
