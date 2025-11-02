import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('CardHive API Gateway')
    .setDescription(`
      Available Services:
      - Auth Service: ${process.env.AUTH_SERVICE_URL}/api/docs
      - Users Service: ${process.env.USERS_SERVICE_URL}/api/docs
    `)
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use('/api/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  }));

  app.use('/api/users', createProxyMiddleware({
    target: process.env.USERS_SERVICE_URL,
    changeOrigin: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API Gateway service: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
