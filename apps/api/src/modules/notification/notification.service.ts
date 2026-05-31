import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('mail.host'),
      port: configService.get<number>('mail.port'),
      auth: {
        user: configService.get<string>('mail.user'),
        pass: configService.get<string>('mail.pass'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to,
      subject,
      html,
    });
  }

  async createInAppNotification(userId: string, type: string, title: string, body: string, data?: any) {
    return this.prisma.notification.create({
      data: { userId, type: type as any, title, body, data },
    });
  }

  async sendBookingConfirmation(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        driver: { select: { email: true, firstName: true } },
        lot: { select: { name: true, address: true } },
        slot: { select: { slotNumber: true } },
      },
    });

    if (!booking) return;

    const html = `
      <h2>Booking Confirmed!</h2>
      <p>Hello ${booking.driver.firstName},</p>
      <p>Your parking booking has been confirmed.</p>
      <ul>
        <li><strong>Location:</strong> ${booking.lot.name}, ${booking.lot.address}</li>
        <li><strong>Slot:</strong> ${booking.slot.slotNumber}</li>
        <li><strong>Start:</strong> ${booking.startTime.toLocaleString()}</li>
        <li><strong>End:</strong> ${booking.endTime.toLocaleString()}</li>
        <li><strong>Check-in Code:</strong> ${booking.checkInCode}</li>
        <li><strong>Check-out Code:</strong> ${booking.checkOutCode}</li>
      </ul>
      <p>Show your check-in code to security when you arrive.</p>
    `;

    await this.sendEmail(booking.driver.email, 'Booking Confirmed - Parko', html);
    await this.createInAppNotification(
      booking.driverId,
      'BOOKING_CONFIRMED',
      'Booking Confirmed',
      `Your booking at ${booking.lot.name} is confirmed.`,
      { bookingId },
    );
  }

  async getUserNotifications(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total };
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
}
