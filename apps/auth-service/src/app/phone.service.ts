import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class PhoneService {
  private readonly logger = new Logger(PhoneService.name);
  private readonly twilioClient: twilio.Twilio | null = null;
  private readonly verifyServiceSID: string;

  constructor(private readonly config: ConfigService) {
    const accountSID = this.config.get('auth.twilio.accountSID');
    const authToken = this.config.get('auth.twilio.authToken');
    this.verifyServiceSID = this.config.get('auth.twilio.verifyServiceSID', '');

    if (accountSID && authToken && this.verifyServiceSID) {
      this.twilioClient = twilio(accountSID, authToken);
      this.logger.log('✅ Twilio Verify initialized');
    } else {
      this.logger.warn('⚠️ Twilio Verify credentials missing - using mock mode');
    }
  }

  async sendVerificationCode(phone: string): Promise<void> {
    if (this.twilioClient) {
      try {
        await this.twilioClient.verify.v2
          .services(this.verifyServiceSID)
          .verifications.create({ to: phone, channel: 'sms' });

        this.logger.log(`📱 Verification SMS sent to ${phone}`);
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${phone}:`, error);
        throw error;
      }
    } else {
      const mockCode = '123456';
      this.logger.log(`📱 [DEV] Verification code for ${phone}: ${mockCode}`);
    }
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    if (this.twilioClient) {
      try {
        const verification = await this.twilioClient.verify.v2
          .services(this.verifyServiceSID)
          .verificationChecks.create({ to: phone, code });

        if (verification.status !== 'approved') {
          throw new UnauthorizedException('Invalid or expired code');
        }

        this.logger.log(`✅ Phone verified: ${phone}`);
        return true;
      } catch (error) {
        this.logger.error(`Verification failed for ${phone}:`, error);
        throw new UnauthorizedException('Invalid or expired code');
      }
    } else {
      if (code === '123456') {
        this.logger.log(`✅ [DEV] Phone verified: ${phone}`);
        return true;
      }
      throw new UnauthorizedException('Invalid code');
    }
  }
}
