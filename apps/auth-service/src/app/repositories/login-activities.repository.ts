import { Injectable } from '@nestjs/common';
import { AuthProvider, PrismaService, User, LoginActivity } from '@card-hive/shared-database';
import type { Request } from 'express';


@Injectable()
export class LoginActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordLogin(
    user: User,
    loginMethod: AuthProvider,
    req: Request,
    markAsSuccessful = false
  ) {
    const userAgent = this.extractUserAgent(req);
    const deviceInfo = this.parseUserAgent(userAgent ?? undefined);

    const activity = await this.prisma.loginActivity.create({
      data: {
        userID: user.id,
        ipAddress: this.extractClientIP(req),
        userAgent,
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

  async getPaginatedByUserID(userID: string, page: number, limit: number) {
    return this.prisma.paginate<LoginActivity>(this.prisma.loginActivity, {
      page,
      limit,
      where: { userID },
      orderBy: { loginAt: 'desc' },
    });
  }

  private extractUserAgent(req: Request): string | null {
    const primary = this.ensureHeaderValue(req.headers['user-agent']);
    if (primary) {
      return primary.substring(0, 500);
    }

    const forwarded = this.ensureHeaderValue(req.headers['x-forwarded-user-agent']);
    if (forwarded) {
      return forwarded.substring(0, 500);
    }

    return null;
  }

  private extractClientIP(req: Request): string | null {
    const headerCandidates = [
      'cf-connecting-ip',
      'x-forwarded-for',
      'x-real-ip',
    ] as const;

    for (const header of headerCandidates) {
      const value = this.ensureHeaderValue(req.headers[header]);
      if (value) {
        return this.normalizeIP(value.split(',')[0].trim());
      }
    }

    const directIP = req.ip || req.socket?.remoteAddress;
    return directIP ? this.normalizeIP(directIP) : null;
  }

  private ensureHeaderValue(value: string | string[] | undefined): string | null {
    if (!value) {
      return null;
    }
    return Array.isArray(value) ? value[0] : value;
  }

  private normalizeIP(ip?: string | null) {
    if (!ip) {
      return null;
    }
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    if (ip === '::1') {
      return '127.0.0.1';
    }
    return ip;
  }

  private parseUserAgent(userAgent?: string | null) {
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
