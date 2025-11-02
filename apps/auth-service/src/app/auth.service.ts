import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  LoginActivitiesRepository,
  RefreshTokensRepository,
  UsersRepository
} from './repositories';
import { PhoneService } from './phone.service';
import { User, AuthProvider, UserRole } from '@card-hive/shared-database';
import {
  AuthVerificationResponse,
  JwtPayload,
  LoginResponse,
  PhoneLoginVerifyRequest,
  RegisterRequest,
} from '@card-hive/shared-types';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly loginActivities: LoginActivitiesRepository,
    private readonly phone: PhoneService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(data: RegisterRequest, req: Request) {
    await this.users.create(
      data.fullName,
      data.email,
      data.phone,
      new Date(data.dateOfBirth),
      UserRole.CUSTOMER,
      AuthProvider.PHONE,
      data.phone,
    );

    return this.phoneLoginRequest(data.phone, req);
  }

  async phoneLoginRequest(phone: string, req: Request): Promise<AuthVerificationResponse> {
    const user = await this.users.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('Invalid phone number');
    }

    await this.phone.sendVerificationCode(phone);
    let sessionID: string | undefined;
    try {
      sessionID = await this.loginActivities.recordLogin(user, AuthProvider.PHONE, req);
    } catch (e) {
    //   Doesn't matter
    }
    return { message: 'Verification code sent', sessionID };
  }

  async phoneLoginVerify(data: PhoneLoginVerifyRequest): Promise<LoginResponse> {
    const { phone, code, sessionID } = data;

    try {
      await this.phone.verifyCode(phone, code);

      const user = await this.users.findByPhone(phone);

      if (!user) {
        throw new UnauthorizedException('Invalid phone number');
      }

      console.log('User: ', user);

      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      if (sessionID) {
        console.log('Session ID: ', sessionID);
        await this.loginActivities.markSuccess(sessionID);
      }

      return {
        accessToken,
        refreshToken,
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      const message = error.data?.message || error.message;
      if (sessionID) {
        await this.loginActivities.markFailure(sessionID, message);
      }
      throw error;
    }
  }

  async getUserProfile(id: string) {
    const user = await this.users.findByID(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenRecord = await this.refreshTokens.findByToken(refreshToken);

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.refreshTokens.deleteByToken(refreshToken);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshTokens.deleteByToken(refreshToken);

    const accessToken = this.generateAccessToken(tokenRecord.user);
    const newRefreshToken = await this.generateRefreshToken(tokenRecord.user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      await this.refreshTokens.deleteByToken(refreshToken);
    } catch (error) {
      // Token might not exist, that's fine
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userID: string): Promise<{ message: string }> {
    await this.refreshTokens.deleteAllByUserID(userID);
    return { message: 'Logged out from all devices' };
  }

  private async generateRefreshToken(userID: string): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    const expiresIn = Number(this.config.get('auth.jwt.refreshTokenExpiresIn', '7'));
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    await this.refreshTokens.create(userID, token, expiresAt);

    return token;
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
    };

    return this.jwt.sign(payload);
  }

  private sanitizeUser(user: User): Partial<User> {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
    };
  }
}
