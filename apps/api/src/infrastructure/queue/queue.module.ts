import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const QUEUES = {
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  PAYMENT: 'payment',
  ANALYTICS: 'analytics',
  WITHDRAWAL: 'withdrawal',
  BOOKING: 'booking',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.EMAIL },
      { name: QUEUES.PAYMENT },
      { name: QUEUES.ANALYTICS },
      { name: QUEUES.WITHDRAWAL },
      { name: QUEUES.BOOKING },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
