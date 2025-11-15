import { plainToInstance } from 'class-transformer';
import { MediaConfigSchema } from './media-config.schema';
import { validateSync } from 'class-validator';
import { registerAs } from '@nestjs/config';

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(MediaConfigSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Media configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

export const mediaConfig = registerAs('media', ()=> {
  const config = validateConfig(process.env);

  return {
    node: {
      environment: config.NODE_ENV,
    },
    services: {
      gateway: config.GATEWAY_SERVICE_URL,
    },
    s3: {
      bucketName: config.S3_BUCKET_NAME,
      region: config.S3_REGION,
      accessKeyID: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: config.S3_FORCE_PATH_STYLE ?? false,
    },
    upload: {
      maxFileBytes: config.MEDIA_MAX_UPLOAD_BYTES ?? 524_288_000,
      partSizeBytes: config.MEDIA_UPLOAD_PART_SIZE_BYTES ?? 5_242_880,
    },
    redis: {
      url: config.REDIS_URL,
      cacheTTL: config.CACHE_TTL,
    },
  };
});
