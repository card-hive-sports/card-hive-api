import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import {
  GetInventoryItemsQueryDto,
  UpdateInventoryItemDto,
} from './dto';
import { Roles, RolesGuard, SelfOrRolesGuard } from '@card-hive/shared-auth';
import { UserRole } from '@card-hive/shared-database';

@ApiTags('Inventory Items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(SelfOrRolesGuard)
  @ApiOperation({ summary: 'List inventory items with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Inventory items retrieved successfully' })
  list(
    @Param('userID', ParseUUIDPipe) userID: string,
    @Query() query: GetInventoryItemsQueryDto
  ) {
    return this.itemsService.listInventoryItems(query, userID);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(SelfOrRolesGuard)
  @ApiOperation({ summary: 'Get a single inventory item by ID' })
  @ApiParam({ name: 'id', description: 'Inventory item UUID' })
  @ApiResponse({ status: 200, description: 'Inventory item found' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  get(
    @Param('userID', ParseUUIDPipe) userID: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ) {
    return this.itemsService.getInventoryItem(id, userID);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update inventory properties like location or timestamps' })
  @ApiParam({ name: 'id', description: 'Inventory item UUID' })
  @ApiResponse({ status: 200, description: 'Inventory item updated successfully' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  update(
    @Param('userID', ParseUUIDPipe) userID: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.itemsService.updateInventoryItem(id, dto, userID);
  }
}
