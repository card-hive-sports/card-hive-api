import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GatewayModule } from './app/gateway.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  const config = app.get(ConfigService);

  const authServiceUrl = config.get('gateway.services.auth');

  const swaggerDoc = new DocumentBuilder()
    .setTitle('CardHive API Gateway')
    .setDescription(`
      Available Services:
      - Auth Service: ${authServiceUrl}/api/docs
    `)
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerDoc);
  SwaggerModule.setup('api/docs', app, document);

  app.use('/api/auth', createProxyMiddleware({
    target: authServiceUrl,
    changeOrigin: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API Gateway service: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
