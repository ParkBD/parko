import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Processor(QUEUES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { notificationId } = job.data;

    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: { select: { email: true, phone: true } } },
    });

    if (!notif) return;

    try {
      switch (notif.channel) {
        case NotificationChannel.EMAIL:
          // TODO: integrate nodemailer
          this.logger.log(`EMAIL to ${notif.user.email}: ${notif.title}`);
          break;
        case NotificationChannel.SMS:
          // TODO: integrate SMS provider
          this.logger.log(`SMS to ${notif.user.phone}: ${notif.body}`);
          break;
        case NotificationChannel.PUSH:
          // TODO: integrate FCM
          this.logger.log(`PUSH to user ${notif.userId}: ${notif.title}`);
          break;
        case NotificationChannel.IN_APP:
          // Already created in DB, nothing to send externally
          break;
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isSent: true, sentAt: new Date() },
      });
    } catch (err) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { failureReason: String(err) },
      });
      throw err;
    }
  }
}
