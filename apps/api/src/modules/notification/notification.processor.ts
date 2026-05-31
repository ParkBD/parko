import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Processor(QUEUES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private notificationService: NotificationService) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing notification job: ${job.name}`);

    switch (job.name) {
      case 'booking.created':
      case 'payment.confirmed':
        await this.notificationService.sendBookingConfirmation(job.data.bookingId);
        break;

      case 'booking.reminder':
        // Send reminder 1hr before
        break;

      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
    }
  }
}
