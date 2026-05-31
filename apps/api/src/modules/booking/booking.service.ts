import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { CreateBookingDto } from './dto/create-booking.dto';

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @InjectQueue(QUEUES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUES.ANALYTICS) private analyticsQueue: Queue,
  ) {}

  async createBooking(driverId: string, dto: CreateBookingDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) throw new BadRequestException('End time must be after start time');

    const conflict = await this.prisma.booking.findFirst({
      where: {
        slotId: dto.slotId,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflict) throw new BadRequestException('Slot is not available for this time range');

    const lot = await this.prisma.parkingLot.findUnique({ where: { id: dto.lotId } });
    if (!lot || lot.status !== 'ACTIVE') throw new NotFoundException('Parking lot not available');

    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const totalAmount = Math.ceil(hours * lot.pricePerHour);

    const checkInCode = generateVerificationCode();
    const checkOutCode = generateVerificationCode();

    const booking = await this.prisma.booking.create({
      data: {
        driverId,
        lotId: dto.lotId,
        slotId: dto.slotId,
        startTime,
        endTime,
        vehicleNumber: dto.vehicleNumber,
        vehicleType: dto.vehicleType ?? 'CAR',
        totalAmount,
        coinsUsed: dto.coinsToUse ?? 0,
        checkInCode,
        checkOutCode,
        status: 'PENDING',
      },
      include: {
        lot: { select: { name: true, address: true } },
        slot: { select: { slotNumber: true } },
      },
    });

    // Cache verification codes in Redis for quick lookup
    await Promise.all([
      this.redis.set(`booking:checkin:${checkInCode}`, booking.id, 86400 * 7),
      this.redis.set(`booking:checkout:${checkOutCode}`, booking.id, 86400 * 7),
    ]);

    await this.notificationQueue.add('booking.created', {
      bookingId: booking.id,
      driverId,
      lotName: booking.lot.name,
      checkInCode,
    });

    return booking;
  }

  async confirmBooking(bookingId: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    });
  }

  async checkIn(code: string, securityId: string) {
    const bookingId = await this.redis.get(`booking:checkin:${code}`);
    if (!bookingId) throw new BadRequestException('Invalid or expired check-in code');

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Booking not confirmed');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'ACTIVE',
        actualStartTime: new Date(),
        checkedInAt: new Date(),
        checkedInBy: securityId,
      },
    });

    await this.redis.del(`booking:checkin:${code}`);
    return updated;
  }

  async checkOut(code: string, securityId: string) {
    const bookingId = await this.redis.get(`booking:checkout:${code}`);
    if (!bookingId) throw new BadRequestException('Invalid or expired check-out code');

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { lot: { select: { ownerId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'ACTIVE') throw new BadRequestException('Booking not active');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        actualEndTime: new Date(),
        checkedOutAt: new Date(),
        checkedOutBy: securityId,
      },
    });

    await this.redis.del(`booking:checkout:${code}`);

    await this.analyticsQueue.add('booking.completed', {
      bookingId,
      lotId: booking.lotId,
      ownerId: booking.lot.ownerId,
      amount: booking.totalAmount,
    });

    return updated;
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driverId !== userId) throw new ForbiddenException();
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Cannot cancel an active or completed booking');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancellationReason: reason },
    });
  }

  async getDriverBookings(driverId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { driverId },
        skip: (page - 1) * limit,
        take: limit,
        include: { lot: { select: { name: true, address: true } }, slot: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: { driverId } }),
    ]);
    return { data, total };
  }

  async getLotBookings(lotId: string, ownerId: string, page: number, limit: number) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id: lotId } });
    if (!lot || lot.ownerId !== ownerId) throw new ForbiddenException();

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { lotId },
        skip: (page - 1) * limit,
        take: limit,
        include: { driver: { select: { firstName: true, lastName: true, phone: true } }, slot: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: { lotId } }),
    ]);
    return { data, total };
  }
}
