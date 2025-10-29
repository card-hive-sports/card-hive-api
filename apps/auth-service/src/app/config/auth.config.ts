import { plainToInstance } from 'class-transformer';
import { AuthConfigSchema } from './auth-config.schema';
import { validateSync } from 'class-validator';
import { registerAs } from '@nestjs/config';

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(AuthConfigSchema, config, {
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

export const authConfig = registerAs('auth', ()=> {
  const config = validateConfig(process.env);

  return {
    database: {
      url: config.DATABASE_URL,
    },
    jwt: {
      secret: config.JWT_SECRET,
      expiresIn: config.JWT_EXPIRES_IN,
      refreshTokenExpiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
    }
  };
});
