import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { ConfigType } from '@nestjs/config';
import { mediaConfig } from '../config/media.config';
import type { MediaFileProgressResponse } from '@card-hive/shared-types';

@Injectable()
export class MediaProgressCache implements OnModuleDestroy {
  private readonly logger = new Logger(MediaProgressCache.name);
  private readonly ttlSeconds: number;
  private readonly client?: Redis;

  constructor(
    @Inject(mediaConfig.KEY)
    private readonly config: ConfigType<typeof mediaConfig>
  ) {
    const redisURL = this.config.redis?.url;
    this.ttlSeconds = this.config.redis?.cacheTTL ?? 300;

    if (!redisURL) {
      this.logger.log('Redis URL not configured; media progress caching disabled');
      return;
    }

    this.client = new Redis(redisURL, { lazyConnect: true });

    this.client.on('ready', () => {
      this.logger.log('Media progress cache connected');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${(error as Error).message}`);
    });

    this.client.connect().catch((error) => {
      this.logger.error(
        `Failed to connect to media progress cache: ${(error as Error).message}`
      );
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async getProgress(id: string): Promise<MediaFileProgressResponse | null> {
    if (!this.isCacheAvailable()) {
      return null;
    }

    try {
      const raw = await this.client?.get(this.buildKey(id));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as MediaFileProgressResponse & {
        updatedAt: string;
      };

      return {
        ...parsed,
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to retrieve media progress from cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      return null;
    }
  }

  async setProgress(snapshot: MediaFileProgressResponse): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      await this.client?.set(
        this.buildKey(snapshot.id),
        JSON.stringify({
          ...snapshot,
          updatedAt: snapshot.updatedAt.toISOString(),
        }),
        'EX',
        this.ttlSeconds
      );
    } catch (error) {
      this.logger.warn(
        `Failed to write media progress cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  async clearProgress(id: string): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      await this.client?.del(this.buildKey(id));
    } catch (error) {
      this.logger.warn(
        `Failed to clear media progress cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  private buildKey(id: string) {
    return `media:progress:${id}`;
  }

  private isCacheAvailable() {
    return !!this.client && this.client.status === 'ready';
  }
}
