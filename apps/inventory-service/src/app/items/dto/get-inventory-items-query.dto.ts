import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CardLocation } from '@card-hive/shared-database';
import { GetInventoryItemsQueryParams } from '@card-hive/shared-types';

export class GetInventoryItemsQueryDto implements GetInventoryItemsQueryParams {
  @ApiPropertyOptional({ description: 'Filter inventory items by owner', example: '1c9b7c65-5f0c-4a2b-bc91-0d5f6f2a7c8e' })
  @IsOptional()
  @IsUUID()
  readonly userID?: string;

  @ApiPropertyOptional({ description: 'Filter inventory items by card', example: '6904f1cd-86b4-436f-9d9f-6a7e6751b194' })
  @IsOptional()
  @IsUUID()
  readonly cardID?: string;

  @ApiPropertyOptional({ description: 'Filter inventory items by location', enum: CardLocation })
  @IsOptional()
  @IsEnum(CardLocation)
  readonly location?: CardLocation;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort direction for acquisition date', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly order?: 'asc' | 'desc' = 'desc';
}
