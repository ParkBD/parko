import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AnalyticsService } from './analytics.service';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Processor(QUEUES.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private analyticsService: AnalyticsService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'booking.completed':
        await this.analyticsService.updateLotAnalytics(job.data.lotId);
        break;
      default:
        this.logger.warn(`Unknown analytics job: ${job.name}`);
    }
  }
}
