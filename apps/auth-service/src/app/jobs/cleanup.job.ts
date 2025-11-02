import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokensRepository } from '../repositories';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(private readonly refreshTokens: RefreshTokensRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens() {
    const result = await this.refreshTokens.deleteExpired();
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
  }
}
