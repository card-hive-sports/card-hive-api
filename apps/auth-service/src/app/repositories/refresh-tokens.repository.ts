import { Injectable } from '@nestjs/common';
import { PrismaService } from '@card-hive/shared-database';

@Injectable()
export class RefreshTokensRepository {
  constructor(private prisma: PrismaService) {}

  async create(userID: string, token: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userID, token, expiresAt },
    });
  }

  async findByToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deleteByToken(token: string) {
    return this.prisma.refreshToken.delete({
      where: { token },
    });
  }

  async deleteAllByUserID(userID: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userID },
    });
  }

  async deleteExpired() {
    return this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
