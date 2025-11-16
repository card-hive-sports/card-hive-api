import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PackType, SportType } from '@card-hive/shared-database';
import { GetPacksQueryParams, PACK_SORT_BY, SORT_ORDER } from '@card-hive/shared-types';

export class GetPacksQueryDto implements GetPacksQueryParams {
  @ApiPropertyOptional({ enum: PackType })
  @IsOptional()
  @IsEnum(PackType)
  readonly packType?: PackType;

  @ApiPropertyOptional({ enum: SportType })
  @IsOptional()
  @IsEnum(SportType)
  readonly sportType?: SportType;

  @ApiPropertyOptional({ description: 'Filter active packs' })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ description: 'Pack list page size', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 20;

  @ApiPropertyOptional({
    enum: PACK_SORT_BY,
    default: PACK_SORT_BY.CREATED_AT
  })
  @IsOptional()
  @IsEnum(PACK_SORT_BY)
  sortBy?: PACK_SORT_BY = PACK_SORT_BY.CREATED_AT;

  @ApiPropertyOptional({
    enum: SORT_ORDER,
    default: SORT_ORDER.DESC
  })
  @IsOptional()
  @IsEnum(SORT_ORDER)
  sortOrder?: SORT_ORDER = SORT_ORDER.DESC;
}
