import { plainToInstance } from 'class-transformer';
import { GatewayConfigSchema } from './gateway-config.schema';
import { validateSync } from 'class-validator';
import { registerAs } from '@nestjs/config';

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(GatewayConfigSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Auth configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

export const gatewayConfig = registerAs('gateway', ()=> {
  const config = validateConfig(process.env);

  return {
    node: {
      environment: config.NODE_ENV,
    },
    services: {
      auth: {
        internal: config.GATEWAY_SERVICES_AUTH,
        external: config.GATEWAY_SERVICES_AUTH_EXTERNAL,
      },
      users: {
        internal: config.GATEWAY_SERVICES_USERS,
        external: config.GATEWAY_SERVICES_USERS_EXTERNAL,
      },
      inventory: {
        internal: config.GATEWAY_SERVICES_INVENTORY,
        external: config.GATEWAY_SERVICES_INVENTORY_EXTERNAL,
      },
      media: {
        internal: config.GATEWAY_SERVICES_MEDIA,
        external: config.GATEWAY_SERVICES_MEDIA_EXTERNAL,
      }
    },
    cors: {
      origins: config.CORS_ORIGINS,
    }
  };
});
