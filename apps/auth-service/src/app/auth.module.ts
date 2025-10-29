import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersRepository } from './repositories/users.repository';
import { PhoneService } from './phone.service';
import { authConfig } from './config/auth.config';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      cache: true,
      expandVariables: true,
    }),
    SharedDatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
  providers: [AuthService, UsersRepository, PhoneService, AuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
