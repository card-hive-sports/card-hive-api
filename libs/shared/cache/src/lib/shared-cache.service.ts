import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis, RedisOptions } from 'ioredis';

export interface SharedRedisCacheOptions {
  redisUrl?: string;
  defaultTTLSeconds?: number;
  logger: Logger;
  redisOptions?: RedisOptions;
}

export interface IndexedCacheOptions {
  indexKey: string;
  ttlSeconds?: number;
  indexExpirySeconds?: number;
}

export abstract class SharedRedisCache implements OnModuleDestroy {
  protected readonly client?: Redis;
  protected readonly logger: Logger;
  protected readonly ttlSeconds: number;

  protected constructor(options: SharedRedisCacheOptions) {
    this.logger = options.logger;
    this.ttlSeconds = this.normalizeTTL(options.defaultTTLSeconds);

    const redisUrl = options.redisUrl;
    if (!redisUrl) {
      this.logger.warn('Redis URL not configured; cache disabled');
      return;
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      ...options.redisOptions,
    });

    this.client.on('ready', () => {
      this.logger.log('Cache connected');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${(error as Error).message}`);
    });

    this.client.connect().catch((error) => {
      this.logger.error(`Failed to initialize Redis connection: ${(error as Error).message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  protected async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.getRaw(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(
        `Failed to parse cache entry for ${key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      return null;
    }
  }

  protected async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.setRaw(key, JSON.stringify(value), ttlSeconds);
  }

  protected async setWithIndex(
    key: string,
    payload: unknown,
    options: IndexedCacheOptions
  ): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    const { indexKey, ttlSeconds, indexExpirySeconds } = options;
    const ttl = ttlSeconds ?? this.ttlSeconds;
    const indexTtl = indexExpirySeconds ?? this.ttlSeconds * 2;

    try {
      await this.client
        ?.multi()
        .set(key, JSON.stringify(payload), 'EX', ttl)
        .sadd(indexKey, key)
        .expire(indexKey, indexTtl)
        .exec();
    } catch (error) {
      this.logger.warn(
        `Failed to persist indexed cache entry ${key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  protected async invalidateIndex(indexKey: string): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      const keys = await this.collectIndexedKeys(indexKey);
      if (keys.length > 0) {
        await this.deleteKeys(keys);
      }
      await this.client?.del(indexKey);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate indexed cache ${indexKey}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  private async getRaw(key: string): Promise<string | null> {
    if (!this.isCacheAvailable()) {
      return null;
    }

    try {
      return await this.client?.get(key) ?? null;
    } catch (error) {
      this.logger.warn(
        `Failed to read cache entry for ${key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      return null;
    }
  }

  private async setRaw(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    const ttl = ttlSeconds ?? this.ttlSeconds;

    try {
      await this.client?.set(key, value, 'EX', ttl);
    } catch (error) {
      this.logger.warn(
        `Failed to write cache entry for ${key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  private async collectIndexedKeys(indexKey: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }

    const keys: string[] = [];
    let cursor = '0';

    try {
      do {
        const [nextCursor, batch] = await this.client.sscan(indexKey, cursor, 'COUNT', 100);
        cursor = nextCursor;
        if (batch.length) {
          keys.push(...batch);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(
        `Failed to collect indexed cache keys for ${indexKey}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }

    return keys;
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) {
      return;
    }

    const batchSize = 100;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      try {
        await this.client.unlink(...batch);
      } catch (error) {
        this.logger.warn(
          `Failed to delete cache keys ${batch.join(', ')}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
      }
    }
  }

  protected isCacheAvailable(): boolean {
    if (!this.client) {
      return false;
    }
    return this.client.status === 'ready';
  }

  private normalizeTTL(ttl?: number): number {
    if (!Number.isFinite(ttl ?? 0) || (ttl ?? 0) <= 0) {
      return 300;
    }
    return Math.floor(ttl ?? 0);
  }
}
