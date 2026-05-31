import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.NOTIFICATION })],
  providers: [NotificationService, NotificationProcessor],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
