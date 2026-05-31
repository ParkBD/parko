import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '@config/app.config';
import databaseConfig from '@config/database.config';
import jwtConfig from '@config/jwt.config';
import mailConfig from '@config/mail.config';
import paymentConfig from '@config/payment.config';
import redisConfig from '@config/redis.config';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { EscrowModule } from '@modules/escrow/escrow.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { BookingModule } from '@modules/booking/booking.module';
import { WithdrawalModule } from '@modules/withdrawal/withdrawal.module';
import { MailModule } from '@mail/mail.module';

/**
 * Lean NestJS application that only bootstraps queue processors.
 * No HTTP server — no ValidationPipe, Swagger, or Helmet.
 * Shares all infrastructure (Prisma, Redis, BullMQ) with the API.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig, paymentConfig, redisConfig],
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    MailModule,
    // Worker-only modules — only the processor side, no controllers
    WalletModule,
    EscrowModule,
    NotificationModule,
    AnalyticsModule,
    BookingModule,
    WithdrawalModule,
  ],
})
class WorkerModule {}

async function bootstrap() {
  const logger = new Logger('Worker');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Prevent accidental shutdown on unhandled signals — let BullMQ drain
  app.enableShutdownHooks();

  logger.log('ParkNest BullMQ Worker started — processing queues: notification, analytics, booking, withdrawal');
}

bootstrap();
