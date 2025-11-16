import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardLocation } from '@card-hive/shared-database';
import { UpdateInventoryItemRequest } from '@card-hive/shared-types';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateInventoryItemDto implements UpdateInventoryItemRequest {
  @ApiPropertyOptional({ description: 'New inventory location for the card', enum: CardLocation })
  @IsOptional()
  @IsEnum(CardLocation)
  readonly location?: CardLocation;

  @ApiPropertyOptional({ description: 'Updated acquisition timestamp for the card', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  readonly acquiredAt?: string;

  @ApiPropertyOptional({ description: 'Updated shipping timestamp for the card', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  readonly shippedAt?: string;
}
