import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LoginActivitiesPaginatedResponse } from '@card-hive/shared-types';
import { SharedRedisCache } from '@card-hive/shared-cache';

@Injectable()
export class LoginActivitiesCache extends SharedRedisCache {
  private readonly indexExpirySeconds: number;

  constructor(config: ConfigService) {
    const logger = new Logger(LoginActivitiesCache.name);
    const redisURL = config.get<string>('auth.redis.url');
    const ttlSeconds = Number(config.get<number>('auth.redis.cacheTTL'));

    super({
      redisUrl: redisURL,
      defaultTTLSeconds: ttlSeconds,
      logger,
    });

    this.indexExpirySeconds = this.ttlSeconds * 2;
  }

  async get(
    userID: string,
    page: number,
    limit: number
  ): Promise<LoginActivitiesPaginatedResponse | null> {
    return this.getJson<LoginActivitiesPaginatedResponse>(
      this.buildKey(userID, page, limit)
    );
  }

  async set(
    userID: string,
    page: number,
    limit: number,
    payload: LoginActivitiesPaginatedResponse
  ): Promise<void> {
    const key = this.buildKey(userID, page, limit);
    const indexKey = this.buildKeyIndex(userID);

    await this.setWithIndex(key, payload, {
      indexKey,
      indexExpirySeconds: this.indexExpirySeconds,
    });
  }

  async invalidate(userID: string): Promise<void> {
    await this.invalidateIndex(this.buildKeyIndex(userID));
  }

  private buildKey(userID: string, page: number, limit: number) {
    return `auth:login-activities:${userID}:page:${page}:limit:${limit}`;
  }

  private buildKeyIndex(userID: string) {
    return `auth:login-activities:${userID}:keys`;
  }
}
