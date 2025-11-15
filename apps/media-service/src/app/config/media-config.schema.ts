import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MediaConfigSchema {
  @IsString()
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  GATEWAY_SERVICE_URL: string;

  @IsString()
  S3_BUCKET_NAME: string;

  @IsString()
  S3_REGION: string;

  @IsString()
  S3_ACCESS_KEY_ID: string;

  @IsString()
  S3_SECRET_ACCESS_KEY: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  @IsOptional()
  @IsBoolean()
  S3_FORCE_PATH_STYLE?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  MEDIA_MAX_UPLOAD_BYTES?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  MEDIA_UPLOAD_PART_SIZE_BYTES?: number;

  @IsString()
  REDIS_URL: string;

  @Type(() => Number)
  @IsNumber()
  CACHE_TTL: number;
}
