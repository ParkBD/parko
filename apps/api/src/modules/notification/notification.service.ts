import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.NOTIFICATION) private notifQueue: Queue,
  ) {}

  async send(userId: string, payload: {
    type: NotificationType;
    title: string;
    body: string;
    channel?: NotificationChannel;
    data?: Record<string, any>;
    expiresAt?: Date;
  }) {
    const notif = await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        channel: payload.channel ?? NotificationChannel.IN_APP,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        expiresAt: payload.expiresAt,
      },
    });

    await this.notifQueue.add('notification.send', { notificationId: notif.id });
    return notif;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
