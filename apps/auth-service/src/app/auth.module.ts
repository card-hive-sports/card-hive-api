import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersRepository } from './repositories/users.repository';
import { PhoneService } from './phone.service';
import { authConfig } from './config/auth.config';
import { AuthGuard } from './guards/auth.guard';
import { CleanupJob } from './jobs/cleanup.job';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      cache: true,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('auth.redis.host', 'redis'),
          port: config.get('auth.redis.port', 6379),
        },
      }),
    }),
    SharedDatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get('JWT_SECRET'),
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
        }
      }
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    PhoneService,
    AuthGuard,
    CleanupJob
  ],
})
export class AuthModule {}
