import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto, GetCardsQueryDto, UpdateCardDto } from './dto';
import { Roles, RolesGuard } from '@card-hive/shared-auth';
import { UserRole } from '@card-hive/shared-database';

@ApiTags('Inventory Cards')
@ApiBearerAuth()
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'List cards with optional filters' })
  @ApiResponse({ status: 200, description: 'Cards retrieved successfully' })
  list(@Query() query: GetCardsQueryDto) {
    return this.cardsService.listCards(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card by ID' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'Card found' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cardsService.getCard(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new card' })
  @ApiResponse({ status: 201, description: 'Card created' })
  create(@Body() dto: CreateCardDto) {
    return this.cardsService.createCard(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update card details' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'Card updated' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.updateCard(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a card' })
  @ApiParam({ name: 'id', description: 'Card UUID' })
  @ApiResponse({ status: 204, description: 'Card deleted' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cardsService.deleteCard(id);
  }
}
