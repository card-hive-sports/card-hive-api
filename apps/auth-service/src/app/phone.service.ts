import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@card-hive/shared-database';

@Injectable()
export class PhoneService {
  private readonly logger = new Logger(PhoneService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendVerificationCode(phone: string): Promise<void> {
    const code = '123456'/*Math.floor(100000 + Math.random() * 900000).toString()*/;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.phoneVerification.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // TODO: Integrate with Twilio/AWS SNS to send SMS
    this.logger.log(`📱 Verification code for ${phone}: ${code}`);
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phone,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    return true;
  }
}
