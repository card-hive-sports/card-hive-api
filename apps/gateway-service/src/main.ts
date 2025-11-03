import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GatewayModule } from './app/gateway.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const getUrl = (url: string, env: string) => {
  if (env === 'development') {
    const port = url.split(':').pop();
    return `http://localhost:${port}`;
  }
  return url;
}

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const environment = config.get('node.environment', 'development');
  const services = config.get<Record<string, string>>('gateway.services', {});

  const allowedOrigins = Object.values(services).map((url) => {
    try {
      const { origin } = new URL(url);

      return getUrl(origin, environment);
    } catch {
      console.log("Not fully qualified");
      return url;
    }
  });

  console.log("Allowed origins: ", allowedOrigins);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const authServiceUrl = services.auth;

  const swaggerDoc = new DocumentBuilder()
    .setTitle('CardHive API Gateway')
    .setDescription([
      '**Available Services:**',
      `- 🔐 [Auth Service API Docs](${getUrl(authServiceUrl, environment)}/api/docs)`
    ].join('\n'))
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerDoc);
  SwaggerModule.setup('api/docs', app, document);

  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: `${authServiceUrl}/api/auth`,
      changeOrigin: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API Gateway service: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
