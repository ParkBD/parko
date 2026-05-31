import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsProcessor } from './analytics.processor';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.ANALYTICS })],
  providers: [AnalyticsService, AnalyticsProcessor],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
