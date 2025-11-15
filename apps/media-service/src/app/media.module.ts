import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { SharedAuthModule, AuthGuard } from '@card-hive/shared-auth';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { mediaConfig } from './config/media.config';
import { MediaProgressCache } from './cache/media-progress.cache';
import { MediaUploadQueue } from './queues/media-upload.queue';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mediaConfig],
      cache: true,
      expandVariables: true,
    }),
    SharedAuthModule,
    SharedDatabaseModule,
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaProgressCache,
    MediaUploadQueue,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class MediaModule {}
