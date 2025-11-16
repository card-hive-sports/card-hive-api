import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardLocation } from '@card-hive/shared-database';
import { CreateInventoryItemRequest } from '@card-hive/shared-types';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateInventoryItemDto implements CreateInventoryItemRequest {
  @ApiProperty({ description: 'Owner of the inventory item', example: '1c9b7c65-5f0c-4a2b-bc91-0d5f6f2a7c8e' })
  @IsUUID()
  readonly userID!: string;

  @ApiProperty({ description: 'Card that is being added to the inventory', example: '6904f1cd-86b4-436f-9d9f-6a7e6751b194' })
  @IsUUID()
  readonly cardID!: string;

  @ApiPropertyOptional({ description: 'Inventory location for the card', enum: CardLocation, default: CardLocation.VAULT })
  @IsOptional()
  @IsEnum(CardLocation)
  readonly location?: CardLocation = CardLocation.VAULT;

  @ApiPropertyOptional({ description: 'Timestamp when the card was acquired', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  readonly acquiredAt?: string;

  @ApiPropertyOptional({ description: 'Timestamp when the card was shipped, if applicable', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  readonly shippedAt?: string;
}
