import { IsNumberString, IsString } from 'class-validator';

export class InventoryConfigSchema {
  @IsString()
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;
  
  @IsString()
  GATEWAY_SERVICE_URL: string;

  @IsString()
  REDIS_URL: string;

  @IsNumberString()
  CACHE_TTL: string;
}
