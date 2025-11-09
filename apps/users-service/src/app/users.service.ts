import { Injectable } from '@nestjs/common';
import { UsersRepository } from './repositories';
import { CreateUserDto, UpdateUserDto, GetUsersQueryDto } from './dto';
import { User } from '@card-hive/shared-database';
import { UserWithInventoryCount } from '@card-hive/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.usersRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: new Date(dto.dateOfBirth),
      role: dto.role,
    });

    return this.sanitizeUser(user);
  }

  async getAllUsers(query: GetUsersQueryDto) {
    const result = await this.usersRepo.findAll(query);
    const users = result.data as UserWithInventoryCount[];

    return {
      data: users.map(user => ({
        ...this.sanitizeUser(user),
        cardsOwned: user._count.inventoryItems,
      })),
      pagination: result.pagination,
    };
  }

  async getUserByID(id: string) {
    const result = await this.usersRepo.findByID(id);
    const user = result as UserWithInventoryCount;
    return {
      ...this.sanitizeUser(user),
      cardsOwned: user._count.inventoryItems,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepo.update(id, {
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    return this.sanitizeUser(user);
  }

  async softDeleteUser(id: string) {
    const user = await this.usersRepo.softDelete(id);
    return this.sanitizeUser(user);
  }

  async forceDeleteUser(id: string) {
    await this.usersRepo.forceDelete(id);
    return { message: 'User permanently deleted' };
  }

  async suspendUser(id: string) {
    const user = await this.usersRepo.suspend(id);
    return this.sanitizeUser(user);
  }

  async getUserLoginActivities(userID: string, page = 1, limit = 20) {
    return this.usersRepo.getLoginActivities(userID, page, limit);
  }

  private sanitizeUser(user: User) {
    const { passwordHash:_, ...sanitized } = user;
    return sanitized;
  }
}
