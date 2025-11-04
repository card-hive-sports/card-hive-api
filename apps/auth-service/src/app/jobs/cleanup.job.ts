import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PasswordResetTokensRepository,
  RefreshTokensRepository,
} from '../repositories';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly passwordResetTokens: PasswordResetTokensRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredRefreshTokens() {
    const result = await this.refreshTokens.deleteExpired();
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredPasswordResetTokens() {
    const result = await this.passwordResetTokens.deleteExpired();
    this.logger.log(`Cleaned up ${result.count} expired password reset tokens`);
  }
}
