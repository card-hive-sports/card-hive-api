import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { ConfigModule } from '@nestjs/config';
import { gatewayConfig } from './config/gateway.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [gatewayConfig],
      cache: true,
      expandVariables: true,
    }),
  ],
  controllers: [GatewayController],
})
export class GatewayModule {}
