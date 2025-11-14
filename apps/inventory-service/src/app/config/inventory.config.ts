import { plainToInstance } from 'class-transformer';
import { InventoryConfigSchema } from './inventory-config.schema';
import { validateSync } from 'class-validator';
import { registerAs } from '@nestjs/config';

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(InventoryConfigSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Inventory configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

export const inventoryConfig = registerAs('inventory', ()=> {
  const config = validateConfig(process.env);

  return {
    node: {
      environment: config.NODE_ENV,
    },
    services: {
      gateway: config.GATEWAY_SERVICE_URL,
    },
    redis: {
      url: config.REDIS_URL,
      cacheTTL: Number(config.CACHE_TTL),
    },
  };
});
