import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { CreateMediaUploadPayload } from '@card-hive/shared-types';
import { Transform } from 'class-transformer';

export class CreateMediaUploadDto implements CreateMediaUploadPayload {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Human-friendly title for the media asset',
    example: 'Holiday photos',
  })
  title?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Short description for the media asset',
    example: 'Upload of the company retreat',
  })
  description?: string;

  @IsOptional()
  @Transform(v => typeof v.value === 'string' ? v.value.split(',') : v.value)
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Tags to associate with the media file',
    example: ['workshop', 'team'],
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return value && typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value
    }
  })
  @IsObject()
  @ApiPropertyOptional({
    description: 'Arbitrary metadata to persist alongside the file',
    example: { camera: 'iPhone', location: 'Lagos' },
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Relative folder path in the bucket to store the file',
    example: 'team/avatars',
  })
  folder?: string;
}
