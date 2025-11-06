import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { SharedAuthModule } from '@card-hive/shared-auth';
import { ConfigModule } from '@nestjs/config';
import { usersConfig } from './config/users.config';

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
  controllers: [AppController],
  providers: [AppService],
})
export class UsersModule {}
