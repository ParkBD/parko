import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class ParkingService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  private serializeSpace(s: any) {
    return {
      ...s,
      pricePerHour: s.pricePerHour?.toNumber?.() ?? s.pricePerHour,
      pricePerDay: s.pricePerDay?.toNumber?.() ?? s.pricePerDay,
      totalRevenue: s.totalRevenue?.toNumber?.() ?? s.totalRevenue,
    };
  }

  async createSpace(ownerId: string, dto: CreateSpaceDto) {
    const space = await this.prisma.parkingSpace.create({
      data: {
        ownerId,
        ...dto,
        availableSlots: dto.totalSlots,
        currency: dto.currency ?? 'BDT',
        country: dto.country ?? 'BD',
        amenities: dto.amenities ?? [],
        isInstantBook: dto.isInstantBook ?? false,
        minBookingHours: dto.minBookingHours ?? 1,
        maxBookingHours: dto.maxBookingHours ?? 24,
      },
    });
    return this.serializeSpace(space);
  }

  async getSpaces(page = 1, limit = 20, city?: string, ownerId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (!ownerId) where.status = 'ACTIVE';
    else where.ownerId = ownerId;

    const [data, total] = await Promise.all([
      this.prisma.parkingSpace.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { images: { where: { isPrimary: true, deletedAt: null }, take: 1 } },
      }),
      this.prisma.parkingSpace.count({ where }),
    ]);
    return { data: data.map(this.serializeSpace), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSpace(id: string) {
    const space = await this.prisma.parkingSpace.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        polygon: true,
        availability: { orderBy: { createdAt: 'asc' } },
        owner: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    });
    if (!space) throw new NotFoundException('Parking space not found');
    return this.serializeSpace(space);
  }

  async updateSpace(id: string, ownerId: string, dto: UpdateSpaceDto) {
    await this.verifyOwnership(id, ownerId);
    const space = await this.prisma.parkingSpace.update({ where: { id }, data: dto as any });
    return this.serializeSpace(space);
  }

  async deleteSpace(id: string, ownerId: string) {
    await this.verifyOwnership(id, ownerId);
    await this.prisma.parkingSpace.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async getOwnerSpaces(ownerId: string) {
    const spaces = await this.prisma.parkingSpace.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        images: { where: { isPrimary: true, deletedAt: null }, take: 1 },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return spaces.map(this.serializeSpace);
  }

  async addImage(spaceId: string, ownerId: string, data: { url: string; thumbnailUrl?: string; caption?: string; isPrimary?: boolean; sortOrder?: number }) {
    await this.verifyOwnership(spaceId, ownerId);
    if (data.isPrimary) {
      await this.prisma.parkingImage.updateMany({ where: { spaceId, deletedAt: null }, data: { isPrimary: false } });
    }
    return this.prisma.parkingImage.create({ data: { spaceId, uploadedBy: ownerId, ...data, isPrimary: data.isPrimary ?? false, sortOrder: data.sortOrder ?? 0 } });
  }

  async removeImage(imageId: string, ownerId: string) {
    const image = await this.prisma.parkingImage.findUnique({ where: { id: imageId }, include: { space: { select: { ownerId: true } } } });
    if (!image) throw new NotFoundException('Image not found');
    if (image.space.ownerId !== ownerId) throw new ForbiddenException();
    await this.prisma.parkingImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async setPolygon(spaceId: string, ownerId: string, data: { coordinates: any; areaSqMeters?: number; centerLat?: number; centerLng?: number; zoomLevel?: number }) {
    await this.verifyOwnership(spaceId, ownerId);
    return this.prisma.parkingPolygon.upsert({
      where: { spaceId },
      create: { spaceId, ...data, zoomLevel: data.zoomLevel ?? 18 },
      update: { ...data },
    });
  }

  async getAvailability(spaceId: string) {
    return this.prisma.parkingAvailability.findMany({ where: { spaceId }, orderBy: { createdAt: 'asc' } });
  }

  async upsertAvailability(spaceId: string, ownerId: string, dto: CreateAvailabilityDto) {
    await this.verifyOwnership(spaceId, ownerId);
    return this.prisma.parkingAvailability.create({
      data: { spaceId, ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
  }

  async deleteAvailability(availId: string, ownerId: string) {
    const avail = await this.prisma.parkingAvailability.findUnique({ where: { id: availId }, include: { space: { select: { ownerId: true } } } });
    if (!avail) throw new NotFoundException();
    if (avail.space.ownerId !== ownerId) throw new ForbiddenException();
    await this.prisma.parkingAvailability.delete({ where: { id: availId } });
    return { success: true };
  }

  private async verifyOwnership(spaceId: string, ownerId: string) {
    const space = await this.prisma.parkingSpace.findFirst({ where: { id: spaceId, deletedAt: null }, select: { ownerId: true } });
    if (!space) throw new NotFoundException('Parking space not found');
    if (space.ownerId !== ownerId) throw new ForbiddenException('You do not own this space');
  }
}
