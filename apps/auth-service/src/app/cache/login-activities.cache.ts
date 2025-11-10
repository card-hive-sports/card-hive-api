import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { LoginActivitiesPaginatedResponse } from '@card-hive/shared-types';

@Injectable()
export class LoginActivitiesCache implements OnModuleDestroy {
  private readonly logger = new Logger(LoginActivitiesCache.name);
  private readonly ttlSeconds: number;
  private readonly client?: Redis;
  private readonly indexExpirySeconds: number;

  constructor(private readonly config: ConfigService) {
    const redisURL = this.config.get<string>('auth.redis.url');
    this.ttlSeconds = this.normalizeTTL(
      Number(this.config.get<number>('auth.redis.cacheTTL'))
    );
    this.indexExpirySeconds = this.ttlSeconds * 2;

    if (!redisURL) {
      this.logger.warn('Redis URL not configured; login activity caching disabled');
      return;
    }

    this.client = new Redis(redisURL, {
      lazyConnect: true,
    });

    this.client.on('ready', () => {
      this.logger.log('Login activities cache connected');
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

  async get(
    userID: string,
    page: number,
    limit: number
  ): Promise<LoginActivitiesPaginatedResponse | null> {
    if (!this.isCacheAvailable()) {
      return null;
    }

    try {
      const cached = await this.client?.get(this.buildKey(userID, page, limit));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to read login activities cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      return null;
    }
  }

  async set(
    userID: string,
    page: number,
    limit: number,
    payload: LoginActivitiesPaginatedResponse
  ): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      const key = this.buildKey(userID, page, limit);
      const indexKey = this.buildKeyIndex(userID);

      await this.client
        ?.multi()
        .set(key, JSON.stringify(payload), 'EX', this.ttlSeconds)
        .sadd(indexKey, key)
        .expire(indexKey, this.indexExpirySeconds)
        .exec();
    } catch (error) {
      this.logger.warn(
        `Failed to write login activities cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  async invalidate(userID: string): Promise<void> {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      const indexKey = this.buildKeyIndex(userID);
      const keys = await this.collectIndexedKeys(indexKey);

      if (keys.length > 0) {
        await this.deleteKeys(keys);
      }

      await this.client?.del(indexKey);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate login activities cache: ${
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

    do {
      const [nextCursor, batch] = await this.client.sscan(
        indexKey,
        cursor,
        'COUNT',
        100
      );
      cursor = nextCursor;
      if (batch.length) {
        keys.push(...batch);
      }
    } while (cursor !== '0');

    return keys;
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) {
      return;
    }

    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await this.client.unlink(...batch);
    }
  }

  private buildKey(userID: string, page: number, limit: number) {
    return `auth:login-activities:${userID}:page:${page}:limit:${limit}`;
  }

  private buildKeyIndex(userID: string) {
    return `auth:login-activities:${userID}:keys`;
  }

  private isCacheAvailable(): boolean {
    if (!this.client) {
      return false;
    }
    return this.client.status === 'ready';
  }

  private normalizeTTL(ttl: number) {
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return 300;
    }
    return Math.floor(ttl);
  }
}
