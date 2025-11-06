import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  RefreshTokensRepository,
  UsersRepository,
  LoginActivitiesRepository,
  PasswordResetTokensRepository,
} from './repositories';
import { PhoneService } from './phone.service';
import { authConfig } from './config/auth.config';
import { CleanupJob } from './jobs/cleanup.job';
import { GoogleService } from './google.service';
import { SharedAuthModule } from '@card-hive/shared-auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      cache: true,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    SharedAuthModule,
    SharedDatabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    RefreshTokensRepository,
    LoginActivitiesRepository,
    PasswordResetTokensRepository,
    PhoneService,
    GoogleService,
    CleanupJob
  ],
})
export class AuthModule {}
