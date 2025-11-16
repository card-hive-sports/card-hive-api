import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CardRarity, SportType } from '@card-hive/shared-database';
import { GetCardsQueryParams } from '@card-hive/shared-types';

export class GetCardsQueryDto implements GetCardsQueryParams {
  @ApiPropertyOptional({ description: 'Pack to which the card belongs' })
  @IsOptional()
  @IsUUID()
  readonly packID?: string;

  @ApiPropertyOptional({ enum: SportType })
  @IsOptional()
  @IsEnum(SportType)
  readonly sportType?: SportType;

  @ApiPropertyOptional({ enum: CardRarity })
  @IsOptional()
  @IsEnum(CardRarity)
  readonly rarity?: CardRarity;

  @ApiPropertyOptional({ description: 'Card serial number' })
  @IsOptional()
  readonly serialNumber?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly order?: 'asc' | 'desc' = 'desc';
}
