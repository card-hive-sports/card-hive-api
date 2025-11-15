import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { GatewayModule } from './app/gateway.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import cookieParser from 'cookie-parser';


const proxyMiddleware = (target: string) => {
  const onProxyReq = (proxyReq: ClientRequest, req: IncomingMessage) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('cookie', req.headers.cookie);
    }
    if (req.headers['x-client-type']) {
      proxyReq.setHeader('x-client-type', req.headers['x-client-type']);
    }
    if (req.headers['authorization']) {
      proxyReq.setHeader('authorization', req.headers['authorization']);
    }
  }

  const onProxyRes = (proxyRes: IncomingMessage, _: IncomingMessage, res: ServerResponse<IncomingMessage>) => {
    if (proxyRes.headers['set-cookie']) {
      res.setHeader('set-cookie', proxyRes.headers['set-cookie']);
    }
  }

  const options: Options = {
    target,
    changeOrigin: true,
    on: {
      proxyReq: onProxyReq,
      proxyRes: onProxyRes,
    },
  };

  return createProxyMiddleware(options);
}

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  const config = app.get(ConfigService);
  const services = config.get<Record<string, { internal: string; external: string; }>>('gateway.services', {});

  const allowedOrigins = Object.values(services).map(({ external }) => {
    try {
      const { origin } = new URL(external);
      return origin;
    } catch {
      return external;
    }
  });

  const corsOrigins: string[] = config.get('gateway.cors.origins', []);

  app.enableCors({
    origin: [...allowedOrigins, ...corsOrigins],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-Type'
    ],
    credentials: true,
  });

  const swaggerDoc = new DocumentBuilder()
    .setTitle('CardHive API Gateway')
    .setDescription([
      '**Available Services:**',
      `- 🔐 [Auth Service API Docs](${services.auth.external}/api/docs)`,
      `- 👥 [Users Service API Docs](${services.users.external}/api/docs)`,
      `- 📦 [Inventory Service API Docs](${services.inventory.external}/api/docs)`,
      `- 📺 [Media Service API Docs](${services.media.external}/api/docs)`
    ].join('\n'))
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerDoc);
  SwaggerModule.setup('api/docs', app, document);

  app.use('/api/auth', proxyMiddleware(`${services.auth.internal}/api/auth`));
  app.use('/api/users', proxyMiddleware(`${services.users.internal}/api/users`));
  app.use('/api/inventory', proxyMiddleware(`${services.inventory.internal}/api/inventory`));
  app.use('/api/files', proxyMiddleware(`${services.media.internal}/api/files`));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API Gateway service: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
