import { Injectable } from '@nestjs/common';
import { PrismaService } from '@card-hive/shared-database';

@Injectable()
export class PasswordResetTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userID: string, token: string, expiresAt: Date) {
    return this.prisma.passwordResetToken.create({
      data: { userID, token, expiresAt },
    });
  }

  async findByToken(token: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async markAsUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}
