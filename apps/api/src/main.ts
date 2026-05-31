import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('ParkNest API')
    .setDescription('Complete parking marketplace API — v2')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication')
    .addTag('users', 'User & Profile management')
    .addTag('parking', 'Parking space management')
    .addTag('search', 'Search parking spaces')
    .addTag('bookings', 'Booking lifecycle')
    .addTag('wallet', 'Wallet & transactions')
    .addTag('payouts', 'Owner payouts')
    .addTag('reviews', 'Reviews & ratings')
    .addTag('notifications', 'Notifications')
    .addTag('analytics', 'Analytics & stats')
    .addTag('admin', 'Admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`ParkNest API running on http://localhost:${port}/api`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
