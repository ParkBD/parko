import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { CreateParkingLotDto } from './dto/create-lot.dto';

const AVAILABILITY_TTL = 60; // 60 seconds cache

@Injectable()
export class ParkingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async createLot(ownerId: string, dto: CreateParkingLotDto) {
    const lot = await this.prisma.parkingLot.create({
      data: {
        ...dto,
        ownerId,
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
        openDays: dto.openDays ?? [0, 1, 2, 3, 4, 5, 6],
        slots: {
          createMany: {
            data: Array.from({ length: dto.totalSlots }, (_, i) => ({
              slotNumber: `S${String(i + 1).padStart(3, '0')}`,
            })),
          },
        },
        analytics: { create: {} },
      },
    });
    return lot;
  }

  async getLot(id: string) {
    const lot = await this.prisma.parkingLot.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        slots: { orderBy: { slotNumber: 'asc' } },
        analytics: true,
        _count: { select: { bookings: true } },
      },
    });
    if (!lot) throw new NotFoundException('Parking lot not found');
    return lot;
  }

  async getOwnerLots(ownerId: string) {
    return this.prisma.parkingLot.findMany({
      where: { ownerId },
      include: { analytics: true, _count: { select: { slots: true, bookings: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLot(id: string, ownerId: string, data: Partial<CreateParkingLotDto>) {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException('Parking lot not found');
    if (lot.ownerId !== ownerId) throw new ForbiddenException();

    return this.prisma.parkingLot.update({ where: { id }, data });
  }

  async getLiveAvailability(lotId: string, startTime: Date, endTime: Date) {
    const cacheKey = `availability:${lotId}:${startTime.toISOString()}:${endTime.toISOString()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const slots = await this.prisma.parkingSlot.findMany({
      where: {
        lotId,
        status: 'AVAILABLE',
        bookings: {
          none: {
            status: { in: ['CONFIRMED', 'ACTIVE', 'PENDING'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
      },
    });

    const result = { availableCount: slots.length, slots };
    await this.redis.set(cacheKey, JSON.stringify(result), AVAILABILITY_TTL);
    return result;
  }

  async approveLot(id: string) {
    return this.prisma.parkingLot.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async getActiveLots(page: number, limit: number, city?: string) {
    const where: any = { status: 'ACTIVE' };
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.parkingLot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { analytics: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.parkingLot.count({ where }),
    ]);

    return { data, total };
  }
}
