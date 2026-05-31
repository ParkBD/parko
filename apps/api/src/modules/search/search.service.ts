import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

const SEARCH_CACHE_TTL = 120;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async radiusSearch(lat: number, lng: number, radiusKm: number, startTime?: Date, endTime?: Date) {
    const cacheKey = `search:radius:${lat}:${lng}:${radiusKm}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const lots = await this.prisma.parkingLot.findMany({
      where: { status: 'ACTIVE' },
      include: {
        analytics: { select: { avgRating: true, totalBookings: true } },
        _count: { select: { slots: true } },
      },
    });

    const nearby = lots
      .map((lot) => ({
        ...lot,
        distance: haversineDistance(lat, lng, lot.latitude, lot.longitude),
      }))
      .filter((lot) => lot.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    await this.redis.set(cacheKey, JSON.stringify(nearby), SEARCH_CACHE_TTL);
    return nearby;
  }

  async polygonSearch(polygon: number[][], startTime?: Date, endTime?: Date) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { status: 'ACTIVE' },
      include: { analytics: true },
    });

    return lots.filter((lot) => isPointInPolygon(lot.latitude, lot.longitude, polygon));
  }
}
