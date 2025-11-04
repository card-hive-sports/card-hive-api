import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
import { AuthGuard } from './guards/auth.guard';
import { CleanupJob } from './jobs/cleanup.job';
import { GoogleService } from './google.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      cache: true,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    SharedDatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get('auth.jwt.secret'),
          signOptions: { expiresIn: config.get('auth.jwt.expiresIn') },
        }
      }
    }),
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
    AuthGuard,
    CleanupJob
  ],
})
export class AuthModule {}
