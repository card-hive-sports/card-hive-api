import { ConflictException, Injectable } from '@nestjs/common';
import { AuthProvider, PrismaService, User, UserRole } from '@card-hive/shared-database';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    fullName: string,
    email: string | null,
    phone: string | null,
    dateOfBirth: Date,
    role: UserRole = UserRole.CUSTOMER,
    provider: AuthProvider,
    providerID: string,
  ): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    if (existing) {
      throw new ConflictException('Email or phone already exists');
    }

    return this.prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        dateOfBirth,
        role,
        authProviders: {
          create: {
            provider,
            providerID,
          }
        }
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByID(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { authProviders: true }
    });
  }

  async findOrCreateByProvider(
    provider: AuthProvider,
    providerID: string,
    userData: { fullName: string; email?: string; phone?: string; dateOfBirth?: Date }
  ): Promise<User> {
    const existingLink = await this.prisma.authProviderLink.findUnique({
      where: {
        provider_providerID: {
          provider,
          providerID,
        },
      },
      include: { user: true },
    });

    if (existingLink) {
      return existingLink.user;
    }

    return await this.prisma.user.create({
      data: {
        fullName: userData.fullName,
        email: userData.email || null,
        phone: userData.phone || null,
        dateOfBirth: userData.dateOfBirth || new Date('2000-01-01'),
        authProviders: {
          create: {
            provider,
            providerID,
          },
        },
      },
    });
  }
}
