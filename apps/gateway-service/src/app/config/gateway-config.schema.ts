import { IsString } from 'class-validator';

export class GatewayConfigSchema {
  @IsString()
  GATEWAY_SERVICES_AUTH: string;
}
