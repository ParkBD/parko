import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

const SEARCH_CACHE_TTL = 300;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async searchNearby(lat: number, lng: number, radiusKm = 5, page = 1, limit = 20) {
    const cacheKey = `search:nearby:${lat}:${lng}:${radiusKm}`;
    const cached = await this.redis.get(cacheKey);
    const allSpaces: any[] = cached ? JSON.parse(cached) : await this.fetchAndCache(cacheKey, lat, lng, radiusKm);

    const skip = (page - 1) * limit;
    const paginated = allSpaces.slice(skip, skip + limit);
    return { data: paginated, total: allSpaces.length, page, limit };
  }

  private async fetchAndCache(cacheKey: string, lat: number, lng: number, radiusKm: number) {
    const spaces = await this.prisma.parkingSpace.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: { images: { where: { isPrimary: true, deletedAt: null }, take: 1 } },
    });
    const nearby = spaces
      .map((s) => ({ ...s, pricePerHour: s.pricePerHour.toNumber(), totalRevenue: s.totalRevenue.toNumber(), distance: haversineKm(lat, lng, s.latitude, s.longitude) }))
      .filter((s) => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
    await this.redis.set(cacheKey, JSON.stringify(nearby), SEARCH_CACHE_TTL);
    return nearby;
  }

  async searchByCity(city: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { status: 'ACTIVE' as const, deletedAt: null as null, city: { contains: city, mode: 'insensitive' as const } };
    const [data, total] = await Promise.all([
      this.prisma.parkingSpace.findMany({ where, skip, take: limit, orderBy: { avgRating: 'desc' }, include: { images: { where: { isPrimary: true, deletedAt: null }, take: 1 } } }),
      this.prisma.parkingSpace.count({ where }),
    ]);
    return { data: data.map((s) => ({ ...s, pricePerHour: s.pricePerHour.toNumber(), totalRevenue: s.totalRevenue.toNumber() })), total, page, limit };
  }
}
