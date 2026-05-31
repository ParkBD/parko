import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

const ANALYTICS_TTL = 300; // 5 min cache

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getSpaceStats(spaceId: string, ownerId: string) {
    const cacheKey = `analytics:space:${spaceId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [space, bookings] = await Promise.all([
      this.prisma.parkingSpace.findFirst({
        where: { id: spaceId, ownerId, deletedAt: null },
        select: { totalRevenue: true, totalBookings: true, avgRating: true, reviewCount: true, availableSlots: true, totalSlots: true },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { spaceId, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const result = {
      spaceId,
      totalRevenue: space?.totalRevenue?.toNumber() ?? 0,
      totalBookings: space?.totalBookings ?? 0,
      avgRating: space?.avgRating ?? 0,
      reviewCount: space?.reviewCount ?? 0,
      occupancyRate: space ? ((space.totalSlots - space.availableSlots) / space.totalSlots) * 100 : 0,
      bookingsByStatus: bookings.reduce((acc, b) => ({ ...acc, [b.status]: b._count.id }), {}),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), ANALYTICS_TTL);
    return result;
  }

  async getOwnerStats(ownerId: string) {
    const cacheKey = `analytics:owner:${ownerId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [spacesAgg, bookingsAgg, recentBookings] = await Promise.all([
      this.prisma.parkingSpace.aggregate({
        where: { ownerId, deletedAt: null },
        _sum: { totalRevenue: true, totalBookings: true },
        _count: { id: true },
        _avg: { avgRating: true },
      }),
      this.prisma.booking.count({
        where: { space: { ownerId }, deletedAt: null, status: 'COMPLETED' },
      }),
      this.prisma.booking.findMany({
        where: { space: { ownerId }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, bookingRef: true, totalAmount: true, status: true, createdAt: true, space: { select: { name: true } } },
      }),
    ]);

    const result = {
      totalSpaces: spacesAgg._count.id,
      totalRevenue: spacesAgg._sum.totalRevenue?.toNumber() ?? 0,
      totalBookings: spacesAgg._sum.totalBookings ?? 0,
      completedBookings: bookingsAgg,
      avgRating: spacesAgg._avg.avgRating ?? 0,
      recentBookings: recentBookings.map((b) => ({
        ...b,
        totalAmount: (b.totalAmount as any).toNumber(),
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), ANALYTICS_TTL);
    return result;
  }

  async getAdminStats() {
    const cacheKey = 'analytics:admin:dashboard';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [users, spaces, bookings, pendingSpaces, pendingPayouts, revenue] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.parkingSpace.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.booking.count({ where: { deletedAt: null } }),
      this.prisma.parkingSpace.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.ownerPayout.count({ where: { status: 'PENDING' } }),
      this.prisma.booking.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
    ]);

    const result = {
      users,
      activeSpaces: spaces,
      totalBookings: bookings,
      pendingApprovals: pendingSpaces,
      pendingPayouts,
      totalRevenue: revenue._sum.totalAmount?.toNumber() ?? 0,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), ANALYTICS_TTL);
    return result;
  }
}
