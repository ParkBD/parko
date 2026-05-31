import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookingStatus, RoleType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { CreateBookingDto } from './dto/create-booking.dto';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @InjectQueue(QUEUES.NOTIFICATION) private notifQueue: Queue,
    @InjectQueue(QUEUES.ANALYTICS) private analyticsQueue: Queue,
  ) {}

  private serializeBooking(b: any) {
    return {
      ...b,
      baseAmount: b.baseAmount?.toNumber?.() ?? b.baseAmount,
      discountAmount: b.discountAmount?.toNumber?.() ?? b.discountAmount,
      totalAmount: b.totalAmount?.toNumber?.() ?? b.totalAmount,
      coinDiscount: b.coinDiscount?.toNumber?.() ?? b.coinDiscount,
    };
  }

  async createBooking(driverId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start <= new Date()) throw new BadRequestException('Start time must be in the future');
    if (end <= start) throw new BadRequestException('End time must be after start time');

    const space = await this.prisma.parkingSpace.findFirst({
      where: { id: dto.spaceId, status: 'ACTIVE', deletedAt: null },
    });
    if (!space) throw new NotFoundException('Parking space not available');
    if (space.availableSlots <= 0) throw new BadRequestException('No available slots');

    // Overlap check
    const overlap = await this.prisma.booking.count({
      where: {
        spaceId: dto.spaceId, deletedAt: null,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
    });
    if (overlap >= space.totalSlots) throw new BadRequestException('Time slot fully booked');

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const baseAmount = parseFloat((hours * space.pricePerHour.toNumber()).toFixed(2));
    const coinsUsed = Math.min(dto.coinsToUse ?? 0, Math.floor(baseAmount * 0.2));
    const coinDiscount = coinsUsed;
    const totalAmount = parseFloat((baseAmount - coinDiscount).toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      // Deduct wallet/coins if needed
      if (dto.paymentMethod === 'WALLET' || dto.paymentMethod === 'COINS') {
        await this.walletService.debitWallet(driverId, totalAmount, 'BOOKING_PAYMENT', {
          description: `Booking payment`, referenceType: 'booking',
        });
      }
      if (coinsUsed > 0) {
        await tx.wallet.update({ where: { userId: driverId }, data: { coinBalance: { decrement: coinsUsed } } });
      }

      const booking = await tx.booking.create({
        data: {
          driverId, spaceId: dto.spaceId, status: BookingStatus.CONFIRMED,
          startTime: start, endTime: end,
          vehicleNumber: dto.vehicleNumber, vehicleType: dto.vehicleType,
          baseAmount, discountAmount: 0, totalAmount, coinsUsed, coinDiscount,
          paymentStatus: 'COMPLETED', paymentMethod: dto.paymentMethod,
          notes: dto.notes,
        },
      });

      await tx.parkingSpace.update({ where: { id: dto.spaceId }, data: { availableSlots: { decrement: 1 } } });

      await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, fromStatus: null, toStatus: BookingStatus.CONFIRMED } });

      const checkInCode = generateCode();
      const codeExpiry = new Date(end.getTime() + 60 * 60 * 1000);
      await tx.verificationCode.create({
        data: { userId: driverId, bookingId: booking.id, type: 'CHECK_IN', code: checkInCode, expiresAt: codeExpiry },
      });

      await tx.booking.update({ where: { id: booking.id }, data: { checkInCode } });

      await this.notifQueue.add('notification.booking', { type: 'BOOKING_CONFIRMED', bookingId: booking.id, userId: driverId });

      return this.serializeBooking(booking);
    });
  }

  async getBookings(driverId: string, page = 1, limit = 20, status?: BookingStatus) {
    const skip = (page - 1) * limit;
    const where: any = { driverId, deletedAt: null };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { space: { select: { name: true, addressLine1: true, city: true } } } }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: data.map(this.serializeBooking), total, page, limit };
  }

  async getOwnerBookings(ownerId: string, page = 1, limit = 20, status?: BookingStatus) {
    const skip = (page - 1) * limit;
    const where: any = { space: { ownerId }, deletedAt: null };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { space: { select: { name: true, city: true } }, driver: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } } }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: data.map(this.serializeBooking), total, page, limit };
  }

  async getBooking(id: string, user: { id: string; roles: RoleType[] }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: { space: { select: { ownerId: true, name: true, addressLine1: true, city: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const isAdmin = user.roles.includes(RoleType.ADMIN) || user.roles.includes(RoleType.SUPER_ADMIN);
    const isDriver = booking.driverId === user.id;
    const isOwner = booking.space.ownerId === user.id;
    if (!isAdmin && !isDriver && !isOwner) throw new ForbiddenException();
    return this.serializeBooking(booking);
  }

  async cancelBooking(id: string, userId: string, reason?: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking) throw new NotFoundException();
    if (booking.driverId !== userId) throw new ForbiddenException();
    if (!([BookingStatus.PENDING, BookingStatus.CONFIRMED] as BookingStatus[]).includes(booking.status)) {
      throw new BadRequestException('Cannot cancel a booking in this state');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED, cancellationReason: reason, cancelledAt: new Date(), cancelledBy: userId } });
      await tx.parkingSpace.update({ where: { id: booking.spaceId }, data: { availableSlots: { increment: 1 } } });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, fromStatus: booking.status, toStatus: BookingStatus.CANCELLED, changedBy: userId, reason } });
    });

    // Refund wallet if paid
    if (booking.paymentMethod === 'WALLET' || booking.paymentMethod === 'COINS') {
      await this.walletService.creditWallet(userId, booking.totalAmount.toNumber(), 'REFUND', { description: 'Booking cancellation refund', referenceType: 'booking', referenceId: id });
    }

    await this.notifQueue.add('notification.booking', { type: 'BOOKING_CANCELLED', bookingId: id, userId });
    return { success: true };
  }

  async checkIn(bookingId: string, code: string, securityUserId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, deletedAt: null } });
    if (!booking) throw new NotFoundException();
    if (booking.status !== BookingStatus.CONFIRMED) throw new BadRequestException('Booking is not confirmed');

    const vc = await this.prisma.verificationCode.findFirst({
      where: { bookingId, type: 'CHECK_IN', isUsed: false, expiresAt: { gt: new Date() } },
    });
    if (!vc) throw new BadRequestException('No valid check-in code found');
    if (vc.attempts >= vc.maxAttempts) throw new BadRequestException('Max attempts reached');
    if (vc.code !== code) {
      await this.prisma.verificationCode.update({ where: { id: vc.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CHECKED_IN, checkedInAt: new Date(), checkedInBy: securityUserId } });
      await tx.verificationCode.update({ where: { id: vc.id }, data: { isUsed: true, usedAt: new Date() } });
      await tx.bookingStatusHistory.create({ data: { bookingId, fromStatus: BookingStatus.CONFIRMED, toStatus: BookingStatus.CHECKED_IN, changedBy: securityUserId } });
    });

    return { success: true, checkedInAt: new Date() };
  }

  async checkOut(bookingId: string, securityUserId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { space: { select: { ownerId: true, pricePerHour: true } } },
    });
    if (!booking) throw new NotFoundException();
    if (booking.status !== BookingStatus.CHECKED_IN) throw new BadRequestException('Booking is not checked in');

    const now = new Date();
    const hours = (now.getTime() - booking.checkedInAt!.getTime()) / (1000 * 60 * 60);
    const ownerEarnings = parseFloat((hours * booking.space.pricePerHour.toNumber() * 0.85).toFixed(2));

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.COMPLETED, checkedOutAt: now, checkedOutBy: securityUserId, actualEndTime: now } });
      await tx.parkingSpace.update({ where: { id: booking.spaceId }, data: { availableSlots: { increment: 1 } } });
      await tx.bookingStatusHistory.create({ data: { bookingId, fromStatus: BookingStatus.CHECKED_IN, toStatus: BookingStatus.COMPLETED, changedBy: securityUserId } });
    });

    await this.walletService.creditWallet(booking.space.ownerId, ownerEarnings, 'CREDIT', { description: 'Booking earnings', referenceType: 'booking', referenceId: bookingId });
    await this.analyticsQueue.add('analytics.event', { event: 'booking.completed', spaceId: booking.spaceId, amount: ownerEarnings });

    return { success: true, checkedOutAt: now };
  }
}
