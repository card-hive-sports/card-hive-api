import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { SharedRedisCache } from '@card-hive/shared-cache';
import { mediaConfig } from '../config/media.config';
import type { MediaFileProgressResponse } from '@card-hive/shared-types';

@Injectable()
export class MediaProgressCache extends SharedRedisCache {
  constructor(@Inject(mediaConfig.KEY) config: ConfigType<typeof mediaConfig>) {
    const logger = new Logger(MediaProgressCache.name);
    super({
      redisUrl: config.redis?.url,
      defaultTTLSeconds: config.redis?.cacheTTL,
      logger,
    });
  }

  async get(id: string): Promise<MediaFileProgressResponse | null> {
    const raw = await this.getJson<MediaFileProgressResponse & { updatedAt: string }>(
      this.buildKey(id)
    );

    if (!raw) {
      return null;
    }

    return {
      ...raw,
      updatedAt: new Date(raw.updatedAt),
    };
  }

  async set(snapshot: MediaFileProgressResponse): Promise<void> {
    await this.setJson(this.buildKey(snapshot.id), {
      ...snapshot,
      updatedAt: snapshot.updatedAt.toISOString(),
    });
  }

  private buildKey(id: string) {
    return `media:progress:${id}`;
  }
}
