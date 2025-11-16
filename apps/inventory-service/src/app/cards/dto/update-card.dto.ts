import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardCondition, CardRarity, SportType } from '@card-hive/shared-database';
import { UpdateCardRequest } from '@card-hive/shared-types';
import { IsEnum, IsInt, IsNumberString, IsOptional, Min } from 'class-validator';

export class UpdateCardDto implements UpdateCardRequest {
  @ApiPropertyOptional({ description: 'Card name' })
  @IsOptional()
  readonly name?: string;

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

  @ApiPropertyOptional({ description: 'Card image URL' })
  @IsOptional()
  readonly imageUrl?: string;

  @ApiPropertyOptional({ description: 'Card banner URL' })
  @IsOptional()
  readonly bannerUrl?: string;
}
