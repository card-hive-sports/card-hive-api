import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { AuthGuard, SharedAuthModule } from '@card-hive/shared-auth';
import { ConfigModule } from '@nestjs/config';
import { usersConfig } from './config/users.config';
import { APP_GUARD } from '@nestjs/core';
import { UsersRepository } from './repositories';
import { SelfOrRolesGuard } from './guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [usersConfig],
      cache: true,
      expandVariables: true,
    }),
    SharedAuthModule,
    SharedDatabaseModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    SelfOrRolesGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }
  ],
})
export class UsersModule {}
