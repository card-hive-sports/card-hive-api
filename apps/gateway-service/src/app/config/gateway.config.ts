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

export const gatewayConfig = registerAs('auth', ()=> {
  const config = validateConfig(process.env);

  return {
    services: {
      auth: config.GATEWAY_SERVICES_AUTH,
    },
  };
});
