import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@card-hive/shared-database';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredVerificationCodes() {
    const deleted = await this.prisma.phoneVerification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`🗑️ Deleted ${deleted.count} expired verification codes`);
    }
  }
}
