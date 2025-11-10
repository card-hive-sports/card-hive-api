import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  LoginActivitiesRepository,
  PasswordResetTokensRepository,
  RefreshTokensRepository,
  UsersRepository,
} from './repositories';
import { PhoneService } from './phone.service';
import { User, AuthProvider, UserRole, LoginActivity } from '@card-hive/shared-database';
import {
  AuthVerificationResponse,
  EmailLoginRequest,
  ForgotPasswordRequest,
  GoogleIDTokenRequest,
  AuthResponse,
  PhoneLoginRequest,
  PhoneLoginVerifyRequest,
  RegisterRequest,
  ResetPasswordRequest,
  LoginActivityResponse,
  LoginActivitiesPaginatedResponse,
} from '@card-hive/shared-types';
import { JwtPayload } from '@card-hive/shared-auth';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { GoogleService } from './google.service';
import { LoginActivitiesCache } from './cache/login-activities.cache';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginActivitiesDefaultLimit = 20;
  private readonly loginActivitiesMaxLimit = 50;
  private readonly loginActivitiesDefaultPage = 1;

  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly loginActivities: LoginActivitiesRepository,
    private readonly passwordResetTokens: PasswordResetTokensRepository,
    private readonly phone: PhoneService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly google: GoogleService,
    private readonly loginActivitiesCache: LoginActivitiesCache
  ) {}

  async register(data: RegisterRequest, req: Request) {
    await this.users.create(
      data.fullName,
      data.email,
      data.phone,
      new Date(data.dateOfBirth),
      UserRole.CUSTOMER,
      AuthProvider.PHONE,
      data.phone
    );

    return this.phoneLoginRequest({ phone: data.phone }, req);
  }

  async phoneLoginRequest(
    { phone }: PhoneLoginRequest,
    req: Request
  ): Promise<AuthVerificationResponse> {
    const user = await this.users.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('Invalid phone number');
    }

    await this.phone.sendVerificationCode(phone);
    let sessionID: string | undefined;
    try {
      sessionID = await this.loginActivities.recordLogin(
        user,
        AuthProvider.PHONE,
        req
      );
    } catch (e) {
      console.error('Failed to record login activity: ', e);
    }
    return { message: 'Verification code sent', sessionID };
  }

  async phoneLoginVerify(
    data: PhoneLoginVerifyRequest
  ): Promise<AuthResponse> {
    const { phone, code, sessionID } = data;

    try {
      await this.phone.verifyCode(phone, code);

      const user = await this.users.findByPhone(phone);

      if (!user) {
        throw new UnauthorizedException('Invalid phone number');
      }

      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      if (sessionID) {
        await this.loginActivities.markSuccess(sessionID);
      }

      this.scheduleLoginActivitiesCacheInvalidation(user.id);

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

  async emailLogin(
    { email, password }: EmailLoginRequest,
    req: Request
  ): Promise<AuthResponse> {
    const user = await this.users.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new BadRequestException('Invalid credentials');
    }

    const sessionID = await this.loginActivities.recordLogin(user, AuthProvider.EMAIL, req);

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      const message = 'Invalid credentials';
      await this.loginActivities.markFailure(sessionID, message);
      throw new BadRequestException(message);
    }

    try {
      await this.loginActivities.markSuccess(sessionID);
    } catch (e: any) {
      this.logger.error('Failed to log activities', e.message);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    this.scheduleLoginActivitiesCacheInvalidation(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async googleLogin({ idToken }: GoogleIDTokenRequest, req: Request): Promise<AuthResponse> {
    const googleUser = await this.google.verifyToken(idToken);

    let user = await this.users.findByEmail(googleUser.email);

    if (!user) {
      user = await this.users.findOrCreateByProvider(
        AuthProvider.GOOGLE,
        googleUser.providerID,
        {
          fullName: googleUser.fullName,
          email: googleUser.email,
          dateOfBirth: new Date('2000-01-01'),
        }
      );
    }

    try {
      await this.loginActivities.recordLogin(user, AuthProvider.GOOGLE, req);
    } catch (e: any) {
      this.logger.error('Failed to log activities', e.message);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    this.scheduleLoginActivitiesCacheInvalidation(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async forgotPassword({
    email,
  }: ForgotPasswordRequest): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.passwordResetTokens.create(user.id, token, expiresAt);

    this.logger.log(`Password reset token for ${email}: ${token}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword({
    token,
    password: newPassword,
  }: ResetPasswordRequest): Promise<{ message: string }> {
    const resetToken = await this.passwordResetTokens.findByToken(token);

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePassword(resetToken.userID, passwordHash);
    await this.passwordResetTokens.markAsUsed(resetToken.id);

    return { message: 'Password reset successfully' };
  }

  async getUserProfile(id: string) {
    const user = await this.users.findByID(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async getLoginActivities(
    userID: string,
    page?: number,
    limit?: number
  ): Promise<LoginActivitiesPaginatedResponse> {
    const normalizedLimit = this.normalizeLoginActivitiesLimit(limit);
    const normalizedPage = this.normalizeLoginActivitiesPage(page);

    const cached = await this.loginActivitiesCache.get(
      userID,
      normalizedPage,
      normalizedLimit
    );
    if (cached) {
      return cached;
    }

    const result = await this.loginActivities.getPaginatedByUserID(
      userID,
      normalizedPage,
      normalizedLimit
    );
    const response: LoginActivitiesPaginatedResponse = {
      data: result.data.map((activity) => this.mapLoginActivity(activity)),
      pagination: result.pagination,
    };

    await this.loginActivitiesCache.set(
      userID,
      normalizedPage,
      normalizedLimit,
      response
    );

    return response;
  }

  async refresh(
    refreshToken: string
  ): Promise<AuthResponse> {
    const tokenRecord = await this.refreshTokens.findByToken(refreshToken);

    if (!tokenRecord) {
      throw new BadRequestException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.refreshTokens.deleteByToken(refreshToken);
      throw new BadRequestException('Refresh token expired');
    }

    await this.refreshTokens.deleteByToken(refreshToken);

    const accessToken = this.generateAccessToken(tokenRecord.user);
    const newRefreshToken = await this.generateRefreshToken(
      tokenRecord.user.id
    );

    const user = await this.users.findByID(tokenRecord.user.id);
    if (!user) {
      throw new BadRequestException('User not found!');
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      await this.refreshTokens.deleteByToken(refreshToken);
    } catch (error: any) {
      this.logger.error('Something went wrong: ', error.message);
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userID: string): Promise<{ message: string }> {
    await this.refreshTokens.deleteAllByUserID(userID);
    return { message: 'Logged out from all devices' };
  }

  private mapLoginActivity(activity: LoginActivity): LoginActivityResponse {
    return {
      id: activity.id,
      userID: activity.userID,
      loginAt: activity.loginAt.toISOString(),
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      deviceType: activity.deviceType,
      platform: activity.platform,
      browser: activity.browser,
      loginMethod: activity.loginMethod,
      success: activity.success,
      failureReason: activity.failureReason,
    };
  }

  private normalizeLoginActivitiesPage(page?: number): number {
    if (typeof page !== 'number' || Number.isNaN(page)) {
      return this.loginActivitiesDefaultPage;
    }

    const sanitized = Math.floor(page);
    if (sanitized < 1) {
      return this.loginActivitiesDefaultPage;
    }

    return sanitized;
  }

  private normalizeLoginActivitiesLimit(limit?: number): number {
    if (typeof limit !== 'number' || Number.isNaN(limit)) {
      return this.loginActivitiesDefaultLimit;
    }

    const sanitized = Math.floor(limit);
    if (sanitized < 1) {
      return 1;
    }

    if (sanitized > this.loginActivitiesMaxLimit) {
      return this.loginActivitiesMaxLimit;
    }

    return sanitized;
  }

  private async generateRefreshToken(userID: string): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    const expiresIn = Number(
      this.config.get('auth.refreshTokenExpiresIn', '7')
    );
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    await this.refreshTokens.create(userID, token, expiresAt);

    return token;
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
    };

    return this.jwt.sign(payload);
  }

  private scheduleLoginActivitiesCacheInvalidation(userID: string): void {
    void this.loginActivitiesCache.invalidate(userID).catch((error: unknown) => {
      this.logger.warn(
        `Failed to invalidate login activities cache for ${userID}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    });
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
