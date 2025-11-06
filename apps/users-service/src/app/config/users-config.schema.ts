import { IsString } from 'class-validator';

export class UsersConfigSchema {
  @IsString()
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  GATEWAY_SERVICE_URL: string;
}
