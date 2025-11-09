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
import { User, AuthProvider, UserRole } from '@card-hive/shared-database';
import {
  AuthVerificationResponse,
  EmailLoginRequest,
  ForgotPasswordRequest,
  GoogleIDTokenRequest,
  LoginResponse,
  PhoneLoginRequest,
  PhoneLoginVerifyRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@card-hive/shared-types';
import { JwtPayload } from '@card-hive/shared-auth';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { GoogleService } from './google.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly loginActivities: LoginActivitiesRepository,
    private readonly passwordResetTokens: PasswordResetTokensRepository,
    private readonly phone: PhoneService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly google: GoogleService
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
  ): Promise<LoginResponse> {
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
  ): Promise<LoginResponse> {
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

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async googleLogin({ idToken }: GoogleIDTokenRequest, req: Request) {
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

  async refresh(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    return {
      accessToken,
      refreshToken: newRefreshToken,
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
