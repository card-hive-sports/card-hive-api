import { plainToInstance } from 'class-transformer';
import { UsersConfigSchema } from './users-config.schema';
import { validateSync } from 'class-validator';
import { registerAs } from '@nestjs/config';

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(UsersConfigSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Users configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

export const usersConfig = registerAs('users', ()=> {
  const config = validateConfig(process.env);

  return {
    node: {
      environment: config.NODE_ENV,
    },
    services: {
      gateway: config.GATEWAY_SERVICE_URL,
    }
  };
});
