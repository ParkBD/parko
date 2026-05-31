import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.ANALYTICS) private analyticsQueue: Queue,
  ) {}

  async createReview(authorId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, driverId: authorId, status: 'COMPLETED', deletedAt: null },
      include: { space: { select: { id: true, ownerId: true } } },
    });
    if (!booking) throw new NotFoundException('Completed booking not found');

    const existing = await this.prisma.review.findUnique({ where: { bookingId: dto.bookingId } });
    if (existing) throw new BadRequestException('Review already submitted for this booking');

    const review = await this.prisma.review.create({
      data: {
        spaceId: booking.space.id,
        authorId,
        targetId: booking.space.ownerId,
        ...dto,
      },
    });

    await this.analyticsQueue.add('analytics.event', { event: 'review.created', spaceId: booking.space.id });
    return review;
  }

  async getSpaceReviews(spaceId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { spaceId, isVisible: true, deletedAt: null as null };
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { author: { select: { profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } } } }),
      this.prisma.review.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async respondToReview(reviewId: string, ownerId: string, response: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, space: { ownerId }, deletedAt: null },
    });
    if (!review) throw new NotFoundException();
    return this.prisma.review.update({ where: { id: reviewId }, data: { ownerResponse: response, ownerResponseAt: new Date() } });
  }
}
