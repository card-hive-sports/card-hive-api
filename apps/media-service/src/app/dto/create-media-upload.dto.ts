import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { CreateMediaUploadPayload } from '@card-hive/shared-types';

export class CreateMediaUploadDto implements CreateMediaUploadPayload {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
