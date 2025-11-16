import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardCondition, CardRarity, SportType } from '@card-hive/shared-database';
import { CreateCardRequest } from '@card-hive/shared-types';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumberString,
  IsInt,
  Min,
  IsString,
} from 'class-validator';

export class CreateCardDto implements CreateCardRequest {
  @ApiProperty({ description: 'Pack to which the card belongs' })
  @IsUUID()
  readonly packID!: string;

  @ApiProperty({ description: 'Card name' })
  @IsNotEmpty()
  readonly name!: string;

  @ApiProperty({ enum: SportType })
  @IsEnum(SportType)
  readonly sportType!: SportType;

  @ApiProperty({ enum: CardRarity })
  @IsEnum(CardRarity)
  readonly rarity!: CardRarity;

  @ApiProperty({ description: 'Card serial number' })
  @IsString()
  readonly serialNumber: string;

  @ApiPropertyOptional({ description: 'Estimated value', type: 'string' })
  @IsOptional()
  @IsNumberString()
  readonly estimatedValue?: string;

  @ApiPropertyOptional({ description: 'Card description' })
  @IsOptional()
  readonly description?: string;

  @ApiPropertyOptional({ description: 'Player name' })
  @IsOptional()
  readonly playerName?: string;

  @ApiPropertyOptional({ description: 'Year the card was produced' })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly year?: number;

  @ApiPropertyOptional({ description: 'Manufacturer' })
  @IsOptional()
  readonly manufacturer?: string;

  @ApiPropertyOptional({ enum: CardCondition })
  @IsOptional()
  @IsEnum(CardCondition)
  readonly condition?: CardCondition;

  @ApiProperty({ description: 'Card image URL' })
  @IsString()
  readonly imageUrl: string;

  @ApiProperty({ description: 'Card banner URL' })
  @IsString()
  readonly bannerUrl: string;

  @ApiPropertyOptional({ description: 'Owner of the card', example: '1c9b7c65-5f0c-4a2b-bc91-0d5f6f2a7c8e' })
  @IsOptional()
  @IsUUID()
  readonly ownerID?: string;
}
