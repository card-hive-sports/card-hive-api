import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from './repositories/users.repository';
import { PhoneService } from './phone.service';
import { User, AuthProvider } from '@card-hive/shared-database';
import { JwtPayload } from '@card-hive/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersRepository,
    private phone: PhoneService,
    private jwt: JwtService,
  ) {}

  async register(
    fullName: string,
    email: string,
    phone: string,
    dateOfBirth: string
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.users.create(
      fullName,
      email,
      phone,
      new Date(dateOfBirth)
    );

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async phoneLoginRequest(phone: string): Promise<{ message: string }> {
    await this.phone.sendVerificationCode(phone);
    return { message: 'Verification code sent' };
  }

  async phoneLoginVerify(
    phone: string,
    code: string
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    await this.phone.verifyCode(phone, code);

    let user = await this.users.findByPhone(phone);

    if (!user) {
      user = await this.users.findOrCreateByProvider(
        AuthProvider.PHONE,
        phone,
        {
          fullName: 'User',
          phone,
        }
      );
    }

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async getUserProfile(id: string) {
    const user = await this.users.findByID(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
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
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
    };
  }
}
