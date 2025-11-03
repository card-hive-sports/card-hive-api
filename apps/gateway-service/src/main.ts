import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GatewayModule } from './app/gateway.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const services = config.get<Record<string, { internal: string; external: string; }>>('gateway.services', {});

  const allowedOrigins = Object.values(services).map(({ internal }) => {
    try {
      const { origin } = new URL(internal);
      return origin;
    } catch {
      return internal;
    }
  });

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const swaggerDoc = new DocumentBuilder()
    .setTitle('CardHive API Gateway')
    .setDescription([
      '**Available Services:**',
      `- 🔐 [Auth Service API Docs](${services.auth.external}/api/docs)`
    ].join('\n'))
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerDoc);
  SwaggerModule.setup('api/docs', app, document);

  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: `${services.auth.internal}/api/auth`,
      changeOrigin: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API Gateway service: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
