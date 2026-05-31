import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.ANALYTICS },
    ),
  ],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
