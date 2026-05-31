import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookingStatus, RoleType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { EscrowService } from '@modules/escrow/escrow.service';
import { MailService } from '@mail/mail.service';
import { VerificationService } from '@modules/verification/verification.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { assertTransition, CANCELLABLE_STATES, SLOT_OCCUPYING_STATES } from './booking-state-machine';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import type { BookingExpireJobData } from './booking-expiry.processor';

// How long a driver has to pay before PENDING expires (ms)
const PENDING_PAYMENT_WINDOW_MS = 10 * 60 * 1000; // 10 min

// How long after startTime a driver can still arrive (ms)
const ARRIVAL_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 min

// Redis lock TTL for the overlap-check + booking-create critical section
const BOOKING_LOCK_TTL_MS = 10_000; // 10 s

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function lockKey(spaceId: string): string {
  return `lock:booking:space:${spaceId}`;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
    private readonly escrowService: EscrowService,
    private readonly mailService: MailService,
    private readonly verificationService: VerificationService,
    @InjectQueue(QUEUES.NOTIFICATION) private readonly notifQueue: Queue,
    @InjectQueue(QUEUES.ANALYTICS) private readonly analyticsQueue: Queue,
    @InjectQueue(QUEUES.BOOKING) private readonly bookingQueue: Queue,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private serialize(b: any) {
    return {
      ...b,
      baseAmount: b.baseAmount?.toNumber?.() ?? b.baseAmount,
      discountAmount: b.discountAmount?.toNumber?.() ?? b.discountAmount,
      totalAmount: b.totalAmount?.toNumber?.() ?? b.totalAmount,
      coinDiscount: b.coinDiscount?.toNumber?.() ?? b.coinDiscount,
    };
  }

  private fmt(d: Date): string {
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });
  }

  /** Fire-and-forget email delivery to driver + all security contacts for the space. */
  private async sendBookingEmails(
    bookingId: string,
    driverId: string,
    arrivalCode: string,
    magicLinkExpiry: Date,
  ): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId },
      include: {
        driver: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        space: {
          select: {
            name: true, addressLine1: true, city: true,
            securityContacts: { select: { email: true, name: true } },
          },
        },
      },
    });
    if (!booking) return;

    const driverName = booking.driver.profile
      ? `${booking.driver.profile.firstName} ${booking.driver.profile.lastName}`
      : booking.driver.email;

    // Driver confirmation
    this.mailService.sendBookingConfirmation(booking.driver.email, {
      driverName,
      bookingRef: booking.bookingRef,
      spaceName: booking.space.name,
      spaceAddress: `${booking.space.addressLine1}, ${booking.space.city}`,
      startTime: this.fmt(booking.startTime),
      endTime: this.fmt(booking.endTime),
      vehicleNumber: booking.vehicleNumber,
      vehicleType: booking.vehicleType,
      totalAmount: `$${booking.totalAmount.toFixed(2)}`,
      arrivalCode,
      paymentMethod: booking.paymentMethod ?? 'WALLET',
    }).catch((err) => this.logger.error(`Driver email failed: ${err.message}`));

    // Security alerts — one per contact, each gets a unique magic token
    for (const contact of booking.space.securityContacts) {
      if (!contact.email) continue;
      this.verificationService
        .createMagicToken(bookingId, driverId)
        .then(({ url, expiresAt }) =>
          this.mailService.sendSecurityAlert(contact.email!, {
            bookingRef: booking.bookingRef,
            spaceName: booking.space.name,
            driverName,
            vehicleNumber: booking.vehicleNumber,
            vehicleType: booking.vehicleType,
            startTime: this.fmt(booking.startTime),
            endTime: this.fmt(booking.endTime),
            arrivalCode,
            magicLinkUrl: url,
            magicLinkExpiry: this.fmt(expiresAt),
          }),
        )
        .catch((err) => this.logger.error(`Security email to ${contact.email} failed: ${err.message}`));
    }
  }

  private async scheduleExpiry(
    bookingId: string,
    expectedStatus: BookingExpireJobData['expectedStatus'],
    reason: BookingExpireJobData['reason'],
    delayMs: number,
  ): Promise<string> {
    const job = await this.bookingQueue.add(
      'booking.expire',
      { bookingId, expectedStatus, reason } satisfies BookingExpireJobData,
      { delay: delayMs, jobId: `expire:${expectedStatus}:${bookingId}` },
    );
    return job.id!;
  }

  private async findBookingOrThrow(id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: { space: { select: { ownerId: true, pricePerHour: true, totalSlots: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // ─── Create Booking (PENDING) ──────────────────────────────────────────────

  async createBooking(driverId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (start <= new Date()) throw new BadRequestException('Start time must be in the future');
    if (end <= start) throw new BadRequestException('End time must be after start time');

    const space = await this.prisma.parkingSpace.findFirst({
      where: { id: dto.spaceId, status: 'ACTIVE', deletedAt: null },
    });
    if (!space) throw new NotFoundException('Parking space not available');

    // ── Redis distributed lock prevents concurrent overlap checks for same space
    return this.redis.withLock(lockKey(dto.spaceId), BOOKING_LOCK_TTL_MS, async () => {
      // Overlap check: count slot-occupying bookings that overlap the requested window
      const occupied = await this.prisma.booking.count({
        where: {
          spaceId: dto.spaceId,
          deletedAt: null,
          status: { in: SLOT_OCCUPYING_STATES },
          AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
        },
      });

      if (occupied >= space.totalSlots) {
        throw new ConflictException('No available slots for the requested time window');
      }

      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const baseAmount = parseFloat((hours * space.pricePerHour.toNumber()).toFixed(2));
      const coinsUsed = Math.min(dto.coinsToUse ?? 0, Math.floor(baseAmount * 0.2));
      const coinDiscount = coinsUsed;
      const totalAmount = parseFloat((baseAmount - coinDiscount).toFixed(2));

      const arrivalCode = generateCode();
      const exitCode = generateCode();

      const booking = await this.prisma.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            driverId,
            spaceId: dto.spaceId,
            status: BookingStatus.PENDING,
            startTime: start,
            endTime: end,
            vehicleNumber: dto.vehicleNumber,
            vehicleType: dto.vehicleType,
            baseAmount,
            discountAmount: 0,
            totalAmount,
            coinsUsed,
            coinDiscount,
            paymentStatus: 'PENDING',
            paymentMethod: dto.paymentMethod,
            arrivalCode,
            exitCode,
            notes: dto.notes,
          },
        });

        await tx.verificationCode.create({
          data: {
            userId: driverId,
            bookingId: b.id,
            type: 'CHECK_IN',
            code: arrivalCode,
            expiresAt: new Date(end.getTime() + ARRIVAL_GRACE_PERIOD_MS),
          },
        });

        await tx.bookingStatusHistory.create({
          data: { bookingId: b.id, fromStatus: null, toStatus: BookingStatus.PENDING },
        });

        return b;
      });

      // Schedule PENDING expiry — driver must pay within 10 min
      await this.scheduleExpiry(booking.id, BookingStatus.PENDING, 'NO_PAYMENT', PENDING_PAYMENT_WINDOW_MS);

      await this.notifQueue.add('notification.booking', {
        type: 'BOOKING_CREATED',
        bookingId: booking.id,
        userId: driverId,
        expiresIn: PENDING_PAYMENT_WINDOW_MS / 1000,
      });

      return this.serialize(booking);
    });
  }

  // ─── Confirm Payment (PENDING → RESERVED) ──────────────────────────────────

  async confirmPayment(bookingId: string, driverId: string, dto: ConfirmPaymentDto) {
    const booking = await this.findBookingOrThrow(bookingId);
    if (booking.driverId !== driverId) throw new ForbiddenException();
    assertTransition(booking.status, BookingStatus.RESERVED);

    const reservationExpiresAt = new Date(booking.startTime.getTime() + ARRIVAL_GRACE_PERIOD_MS);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Deduct payment
      if (booking.paymentMethod === 'WALLET') {
        await this.walletService.debitWallet(driverId, booking.totalAmount.toNumber(), 'BOOKING_PAYMENT', {
          description: `Payment for booking ${booking.bookingRef}`,
          referenceType: 'booking',
          referenceId: bookingId,
        });
      }
      if (booking.coinsUsed > 0) {
        await tx.wallet.update({
          where: { userId: driverId },
          data: { coinBalance: { decrement: booking.coinsUsed } },
        });
      }

      // Lock slot
      await tx.parkingSpace.update({
        where: { id: booking.spaceId },
        data: { availableSlots: { decrement: 1 } },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.RESERVED,
          paymentStatus: 'COMPLETED',
          reservedAt: now,
          reservationExpiresAt,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.RESERVED,
          metadata: { paymentMethod: booking.paymentMethod },
        },
      });
    });

    // COINS: hold in escrow after RESERVED
    if (booking.paymentMethod === 'COINS') {
      await this.escrowService.holdForBooking(bookingId, driverId, booking.space.ownerId, Math.round(booking.totalAmount.toNumber()));
    }

    // Schedule RESERVED expiry — driver must arrive by startTime + grace
    const arrivalWindowMs = reservationExpiresAt.getTime() - now.getTime();
    await this.scheduleExpiry(bookingId, BookingStatus.RESERVED, 'NO_ARRIVAL', Math.max(arrivalWindowMs, 60_000));

    // ── Email: driver confirmation + security alert ──────────────────────────
    await this.sendBookingEmails(bookingId, driverId, booking.arrivalCode ?? '', reservationExpiresAt);

    await this.notifQueue.add('notification.booking', { type: 'BOOKING_RESERVED', bookingId, userId: driverId });

    return { success: true, reservationExpiresAt };
  }

  // ─── Mark Arrived (RESERVED → ARRIVED) ────────────────────────────────────

  async markArrived(bookingId: string, code: string, securityUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);
    assertTransition(booking.status, BookingStatus.ARRIVED);

    const vc = await this.prisma.verificationCode.findFirst({
      where: { bookingId, type: 'CHECK_IN', isUsed: false, expiresAt: { gt: new Date() } },
    });
    if (!vc) throw new BadRequestException('No valid arrival code found');
    if (vc.attempts >= vc.maxAttempts) throw new BadRequestException('Max code attempts reached');
    if (vc.code !== code) {
      await this.prisma.verificationCode.update({
        where: { id: vc.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid arrival code');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.ARRIVED,
          arrivedAt: now,
          arrivedBy: securityUserId,
        },
      });
      await tx.verificationCode.update({
        where: { id: vc.id },
        data: { isUsed: true, usedAt: now },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.RESERVED,
          toStatus: BookingStatus.ARRIVED,
          changedBy: securityUserId,
        },
      });
    });

    return { success: true, arrivedAt: now };
  }

  // ─── Start Session (ARRIVED → ACTIVE) ─────────────────────────────────────

  async startSession(bookingId: string, securityUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);
    assertTransition(booking.status, BookingStatus.ACTIVE);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.ACTIVE,
          sessionStartedAt: now,
          sessionStartedBy: securityUserId,
        },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.ARRIVED,
          toStatus: BookingStatus.ACTIVE,
          changedBy: securityUserId,
        },
      });
    });

    await this.notifQueue.add('notification.booking', { type: 'BOOKING_ACTIVE', bookingId, userId: booking.driverId });
    return { success: true, sessionStartedAt: now };
  }

  // ─── Complete Session (ACTIVE → COMPLETED) ─────────────────────────────────

  async completeSession(bookingId: string, securityUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);
    assertTransition(booking.status, BookingStatus.COMPLETED);

    const now = new Date();
    const sessionStart = booking.sessionStartedAt ?? booking.arrivedAt ?? booking.startTime;
    const hours = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60);
    const actualAmount = parseFloat((hours * booking.space.pricePerHour.toNumber()).toFixed(2));
    const ownerEarnings = parseFloat((actualAmount * 0.85).toFixed(2));

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          sessionEndedAt: now,
          sessionEndedBy: securityUserId,
          paymentStatus: 'COMPLETED',
        },
      });
      await tx.parkingSpace.update({
        where: { id: booking.spaceId },
        data: {
          availableSlots: { increment: 1 },
          totalBookings: { increment: 1 },
          totalRevenue: { increment: actualAmount },
        },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.ACTIVE,
          toStatus: BookingStatus.COMPLETED,
          changedBy: securityUserId,
          metadata: { hours: hours.toFixed(2), actualAmount },
        },
      });
    });

    // Settle payment
    if (booking.paymentMethod === 'COINS') {
      const actualCoins = Math.round(hours * booking.space.pricePerHour.toNumber());
      await this.escrowService.releaseOnComplete(bookingId, actualCoins);
    } else {
      await this.walletService.creditWallet(booking.space.ownerId, ownerEarnings, 'CREDIT', {
        description: `Earnings for booking ${booking.bookingRef}`,
        referenceType: 'booking',
        referenceId: bookingId,
      });
    }

    await this.analyticsQueue.add('analytics.event', {
      event: 'booking.completed',
      spaceId: booking.spaceId,
      amount: actualAmount,
      hours,
    });

    await this.notifQueue.add('notification.booking', { type: 'BOOKING_COMPLETED', bookingId, userId: booking.driverId });
    return { success: true, sessionEndedAt: now, actualAmount };
  }

  // ─── Cancel Booking ─────────────────────────────────────────────────────────

  async cancelBooking(id: string, userId: string, reason?: string) {
    const booking = await this.findBookingOrThrow(id);
    if (booking.driverId !== userId) throw new ForbiddenException();
    if (!CANCELLABLE_STATES.includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a booking in status ${booking.status}`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
          cancelledBy: userId,
        },
      });

      // Return slot only if it was occupied
      if (SLOT_OCCUPYING_STATES.includes(booking.status)) {
        await tx.parkingSpace.update({
          where: { id: booking.spaceId },
          data: { availableSlots: { increment: 1 } },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          changedBy: userId,
          reason,
        },
      });
    });

    // Refund only if payment was collected (RESERVED or later)
    if (booking.status !== BookingStatus.PENDING) {
      if (booking.paymentMethod === 'COINS') {
        try { await this.escrowService.refundOnCancel(id); } catch { /* no-op */ }
      } else if (booking.paymentMethod === 'WALLET') {
        await this.walletService.creditWallet(userId, booking.totalAmount.toNumber(), 'REFUND', {
          description: `Cancellation refund for booking ${booking.bookingRef}`,
          referenceType: 'booking',
          referenceId: id,
        });
      }
    }

    await this.notifQueue.add('notification.booking', { type: 'BOOKING_CANCELLED', bookingId: id, userId });
    return { success: true };
  }

  // ─── Read Methods ───────────────────────────────────────────────────────────

  async getBookings(driverId: string, page = 1, limit = 20, status?: BookingStatus) {
    const skip = (page - 1) * limit;
    const where: any = { driverId, deletedAt: null };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { space: { select: { name: true, addressLine1: true, city: true } } },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: data.map((b) => this.serialize(b)), total, page, limit };
  }

  async getOwnerBookings(ownerId: string, page = 1, limit = 20, status?: BookingStatus) {
    const skip = (page - 1) * limit;
    const where: any = { space: { ownerId }, deletedAt: null };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          space: { select: { name: true, city: true } },
          driver: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: data.map((b) => this.serialize(b)), total, page, limit };
  }

  async getBooking(id: string, user: { id: string; roles: RoleType[] }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        space: { select: { ownerId: true, name: true, addressLine1: true, city: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isAdmin = user.roles.includes(RoleType.ADMIN) || user.roles.includes(RoleType.SUPER_ADMIN);
    const isDriver = booking.driverId === user.id;
    const isOwner = booking.space.ownerId === user.id;
    if (!isAdmin && !isDriver && !isOwner) throw new ForbiddenException();

    return this.serialize(booking);
  }
}
