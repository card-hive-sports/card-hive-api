import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, GetUsersQueryDto } from './dto';
import { Roles, RolesGuard } from '@card-hive/shared-auth';
import { UserRole } from '@card-hive/shared-database';
import { SelfOrRolesGuard } from './guards';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all users with filters, sorting, and pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return this.users.getAllUsers(query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(SelfOrRolesGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByID(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.users.getUserByID(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(SelfOrRolesGuard)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  async updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateUser(id, dto);
  }

  @Delete(':id/soft')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseGuards(SelfOrRolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete user (set isActive to false)' })
  @ApiResponse({ status: 200, description: 'User soft deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async softDeleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.users.softDeleteUser(id);
  }

  @Delete(':id/force')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force delete user (permanent deletion)' })
  @ApiResponse({ status: 200, description: 'User permanently deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forceDeleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.users.forceDeleteUser(id);
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user (set isActive to false)' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.users.suspendUser(id);
  }

  @Get(':id/login-activities')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseGuards(SelfOrRolesGuard)
  @ApiOperation({ summary: 'Get user login activities' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Login activities retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserLoginActivities(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.users.getUserLoginActivities(id, page, limit);
  }
}
