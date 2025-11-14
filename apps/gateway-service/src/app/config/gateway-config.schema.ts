import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GatewayConfigSchema {
  @IsString()
  NODE_ENV: string;

  @IsString()
  GATEWAY_SERVICES_AUTH: string;

  @IsString()
  GATEWAY_SERVICES_AUTH_EXTERNAL: string;

  @IsString()
  GATEWAY_SERVICES_USERS: string;

  @IsString()
  GATEWAY_SERVICES_USERS_EXTERNAL: string;

  @IsString()
  GATEWAY_SERVICES_INVENTORY: string;

  @IsString()
  GATEWAY_SERVICES_INVENTORY_EXTERNAL: string;

  @IsOptional()
  @Transform(v => v.value?.split(','))
  @IsString({ each: true })
  CORS_ORIGINS: string[];
}
