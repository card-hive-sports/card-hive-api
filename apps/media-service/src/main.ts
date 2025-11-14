import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { MediaModule } from './app/media.module';

async function bootstrap() {
  const app = await NestFactory.create(MediaModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  const config = app.get(ConfigService);
  const gatewayServiceUrl = config.get('media.services.gateway');

  const swaggerDoc = new DocumentBuilder()
    .setTitle('CardHive Media Service')
    .setDescription('File Upload/Retrieval API')
    .addServer(gatewayServiceUrl, 'Gateway API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerDoc);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(`🚀 Media service: http://localhost:${port}/api`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
