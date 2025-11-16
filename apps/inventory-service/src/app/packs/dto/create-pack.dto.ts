import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PackType, SportType } from '@card-hive/shared-database';
import { CreatePackRequest } from '@card-hive/shared-types';
import { IsBoolean, IsNumberString, IsOptional, IsEnum, IsString } from 'class-validator';

export class CreatePackDto implements CreatePackRequest {
  @ApiProperty({ enum: PackType })
  @IsEnum(PackType)
  readonly packType!: PackType;

  @ApiProperty({ enum: SportType })
  @IsEnum(SportType)
  readonly sportType!: SportType;

  @ApiPropertyOptional({ description: 'Pack description' })
  @IsOptional()
  readonly description?: string;

  @ApiProperty({ description: 'Pack image URL' })
  @IsString()
  readonly imageUrl: string;

  @ApiProperty({ description: 'Pack banner URL' })
  @IsString()
  readonly bannerUrl: string;

  @ApiProperty({ description: 'Pack price', type: 'string' })
  @IsNumberString()
  readonly price: string;

  @ApiPropertyOptional({ description: 'Whether the pack is active', default: true })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
