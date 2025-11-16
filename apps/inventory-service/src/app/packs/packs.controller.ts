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
import { PacksService } from './packs.service';
import { CreatePackDto, GetPacksQueryDto, UpdatePackDto } from './dto';
import { UserRole } from '@card-hive/shared-database';
import { Roles, RolesGuard } from '@card-hive/shared-auth';

@ApiTags('Inventory Packs')
@ApiBearerAuth()
@Controller('packs')
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get()
  @ApiOperation({ summary: 'List packs with optional filters' })
  @ApiResponse({ status: 200, description: 'Packs retrieved successfully' })
  list(@Query() query: GetPacksQueryDto) {
    return this.packsService.listPacks(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pack by ID' })
  @ApiParam({ name: 'id', description: 'Pack UUID' })
  @ApiResponse({ status: 200, description: 'Pack found' })
  @ApiResponse({ status: 404, description: 'Pack not found' })
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.packsService.getPack(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new pack' })
  @ApiResponse({ status: 201, description: 'Pack created' })
  create(@Body() dto: CreatePackDto) {
    return this.packsService.createPack(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update pack details' })
  @ApiParam({ name: 'id', description: 'Pack UUID' })
  @ApiResponse({ status: 200, description: 'Pack updated' })
  @ApiResponse({ status: 404, description: 'Pack not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePackDto,
  ) {
    return this.packsService.updatePack(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pack' })
  @ApiParam({ name: 'id', description: 'Pack UUID' })
  @ApiResponse({ status: 204, description: 'Pack deleted' })
  @ApiResponse({ status: 404, description: 'Pack not found' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.packsService.deletePack(id);
  }
}
