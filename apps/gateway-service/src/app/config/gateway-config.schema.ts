import { IsString } from 'class-validator';

export class GatewayConfigSchema {
  @IsString()
  NODE_ENV: string;

  @IsString()
  GATEWAY_SERVICES_AUTH: string;

  @IsString()
  GATEWAY_SERVICES_AUTH_EXTERNAL: string;
}
