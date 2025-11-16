import { ApiPropertyOptional } from '@nestjs/swagger';
import { PackType, SportType } from '@card-hive/shared-database';
import { UpdatePackRequest } from '@card-hive/shared-types';
import { IsBoolean, IsEnum, IsNumberString, IsOptional } from 'class-validator';

export class UpdatePackDto implements UpdatePackRequest {
  @ApiPropertyOptional({ description: 'Pack name' })
  @IsOptional()
  readonly name?: string;

  @ApiPropertyOptional({ enum: PackType })
  @IsOptional()
  @IsEnum(PackType)
  readonly packType?: PackType;

  @ApiPropertyOptional({ enum: SportType })
  @IsOptional()
  @IsEnum(SportType)
  readonly sportType?: SportType;

  @ApiPropertyOptional({ description: 'Pack description' })
  @IsOptional()
  readonly description?: string;

  @ApiPropertyOptional({ description: 'Pack image URL' })
  @IsOptional()
  readonly imageUrl?: string;

  @ApiPropertyOptional({ description: 'Pack banner URL' })
  @IsOptional()
  readonly bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Pack price', type: 'string' })
  @IsOptional()
  @IsNumberString()
  readonly price?: string;

  @ApiPropertyOptional({ description: 'Whether the pack is active' })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
