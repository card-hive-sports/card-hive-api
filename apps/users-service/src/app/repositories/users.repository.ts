import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService, User, UserRole, Prisma } from '@card-hive/shared-database';
import { GetUsersQueryDto } from '../dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    fullName: string;
    email?: string;
    phone?: string;
    dateOfBirth: Date;
    role?: UserRole;
  }): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : {},
          data.phone ? { phone: data.phone } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    if (existing) {
      throw new ConflictException('Email or phone already exists');
    }

    return this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth,
        role: data.role || UserRole.CUSTOMER,
      },
    });
  }

  async findAll(query: GetUsersQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.kycStatus) {
      where.kycStatus = query.kycStatus;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isDeleted !== undefined) {
      where.isDeleted = query.isDeleted;
    }

    const orderBy: Record<string, string> = {};
    if (query.sortBy && query.sortOrder) {
      orderBy[query.sortBy] = query.sortOrder;
    }

    return this.prisma.paginate<User>(this.prisma.user, {
      page: query.page,
      limit: query.limit,
      where,
      orderBy,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        walletBalance: true,
        walletCurrency: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });
  }

  async findByID(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        authProviders: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, data: {
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
  }): Promise<User> {
    const user = await this.findByID(id);

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    if (data.phone && data.phone !== user.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });
      if (existing) {
        throw new ConflictException('Phone already exists');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
      },
    });
  }

  async softDelete(id: string): Promise<User> {
    await this.findByID(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async forceDelete(id: string): Promise<void> {
    await this.findByID(id);

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async suspend(id: string): Promise<User> {
    return this.softDelete(id);
  }

  async getLoginActivities(userID: string, page = 1, limit = 20) {
    await this.findByID(userID);

    return this.prisma.paginate(this.prisma.loginActivity, {
      page,
      limit,
      where: { userID },
      orderBy: { loginAt: 'desc' },
    });
  }
}
