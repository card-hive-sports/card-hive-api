import { Injectable } from '@nestjs/common';
import { AuthProvider, PrismaService, User } from '@card-hive/shared-database';
import type { Request } from 'express';


@Injectable()
export class LoginActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordLogin(user: User, loginMethod: AuthProvider, req: Request, markAsSuccessful = false) {
    const userAgent = req.headers['user-agent'];
    const deviceInfo = this.parseUserAgent(userAgent);

    const activity = await this.prisma.loginActivity.create({
      data: {
        userID: user.id,
        ipAddress: (req.ip || req.headers['x-forwarded-for']) as string,
        deviceType: deviceInfo.deviceType,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        loginMethod,
        success: markAsSuccessful,
      }
    });

    return activity.id;
  }

  async markSuccess(id: string) {
    return this.prisma.loginActivity.updateMany({
      where: { id },
      data: { success: true, failureReason: null }
    });
  }

  async markFailure(id: string, reason: string) {
    return this.prisma.loginActivity.updateMany({
      where: { id },
      data: { success: false, failureReason: reason }
    });
  }

  private parseUserAgent(userAgent?: string) {
    if (!userAgent) {
      return {
        deviceType: 'unknown',
        platform: 'unknown',
        browser: 'unknown',
      };
    }

    const ua = userAgent.toLowerCase();

    let deviceType = 'desktop';
    if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      deviceType = 'tablet';
    }

    let platform = 'unknown';
    if (/windows/i.test(ua)) platform = 'Windows';
    else if (/mac os x/i.test(ua)) platform = 'macOS';
    else if (/linux/i.test(ua)) platform = 'Linux';
    else if (/android/i.test(ua)) platform = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) platform = 'iOS';

    let browser = 'unknown';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    return { deviceType, platform, browser };
  }
}
