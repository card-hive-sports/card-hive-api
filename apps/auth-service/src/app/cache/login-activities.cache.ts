import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { LoginActivitiesPaginatedResponse } from '@card-hive/shared-types';

@Injectable()
export class LoginActivitiesCache implements OnModuleDestroy {
  private readonly logger = new Logger(LoginActivitiesCache.name);
  private readonly ttlSeconds: number;
  private readonly client?: Redis;

  constructor(private readonly config: ConfigService) {
    const redisURL = this.config.get<string>('auth.redis.url');
    this.ttlSeconds = this.normalizeTTL(
      Number(this.config.get<number>('auth.redis.cacheTTL') ?? 300)
    );

    if (!redisURL) {
      this.logger.warn('Redis URL not configured; login activity caching disabled');
      return;
    }

    this.client = new Redis(redisURL, {
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${(error as Error).message}`);
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
    if (!this.client) {
      return null;
    }

    try {
      const cached = await this.client.get(this.buildKey(userID, page, limit));
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
    if (!this.client) {
      return;
    }

    try {
      await this.client.set(
        this.buildKey(userID, page, limit),
        JSON.stringify(payload),
        'EX',
        this.ttlSeconds
      );
    } catch (error) {
      this.logger.warn(
        `Failed to write login activities cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  async invalidate(userID: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const keys = await this.collectKeys(`auth:login-activities:${userID}:*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate login activities cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  private async collectKeys(pattern: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }

    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, scanKeys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        50
      );
      cursor = nextCursor;
      if (scanKeys.length) {
        keys.push(...scanKeys);
      }
    } while (cursor !== '0');

    return keys;
  }

  private buildKey(userID: string, page: number, limit: number) {
    return `auth:login-activities:${userID}:page:${page}:limit:${limit}`;
  }

  private normalizeTTL(ttl: number) {
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return 300;
    }
    return Math.floor(ttl);
  }
}
