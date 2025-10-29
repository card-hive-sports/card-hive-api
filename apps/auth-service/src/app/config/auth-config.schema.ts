import { IsString } from 'class-validator';

export class AuthConfigSchema {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  REFRESH_TOKEN_EXPIRES_IN: string;
}
