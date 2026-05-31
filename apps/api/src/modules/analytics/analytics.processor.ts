import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Processor(QUEUES.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  async process(job: Job) {
    const { event, spaceId, amount } = job.data;

    if (event === 'booking.completed' && spaceId) {
      await this.prisma.parkingSpace.update({
        where: { id: spaceId },
        data: {
          totalBookings: { increment: 1 },
          totalRevenue: { increment: new Decimal(amount || 0) },
        },
      });
      await this.redis.del(`analytics:space:${spaceId}`);
    }

    if (event === 'review.created' && spaceId) {
      const agg = await this.prisma.review.aggregate({
        where: { spaceId, deletedAt: null, isVisible: true },
        _avg: { overallRating: true },
        _count: { id: true },
      });
      await this.prisma.parkingSpace.update({
        where: { id: spaceId },
        data: {
          avgRating: agg._avg.overallRating ?? 0,
          reviewCount: agg._count.id,
        },
      });
      await this.redis.del(`analytics:space:${spaceId}`);
    }
  }
}
