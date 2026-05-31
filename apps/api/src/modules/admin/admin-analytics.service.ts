import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

const CACHE_TTL = 300; // 5 min

type Granularity = 'daily' | 'weekly' | 'monthly';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const result = await fn();
    await this.redis.set(key, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  // ─── Platform Overview ─────────────────────────────────────────────────────

  async getOverview() {
    return this.cached('admin:analytics:overview', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [
        totalUsers, newUsersToday, newUsersMonth,
        totalSpaces, activeSpaces, pendingApproval,
        totalBookings, bookingsToday, bookingsMonth,
        revenueTotal, revenueMonth, revenueLastMonth,
        completedBookings, cancelledBookings, expiredBookings,
        pendingDisputes,
      ] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
        this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: thisMonth } } }),
        this.prisma.parkingSpace.count({ where: { deletedAt: null } }),
        this.prisma.parkingSpace.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
        this.prisma.parkingSpace.count({ where: { status: 'PENDING_APPROVAL' } }),
        this.prisma.booking.count({ where: { deletedAt: null } }),
        this.prisma.booking.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
        this.prisma.booking.count({ where: { deletedAt: null, createdAt: { gte: thisMonth } } }),
        this.prisma.booking.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
        this.prisma.booking.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: thisMonth } }, _sum: { totalAmount: true } }),
        this.prisma.booking.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: lastMonth, lte: lastMonthEnd } }, _sum: { totalAmount: true } }),
        this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
        this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
        this.prisma.booking.count({ where: { status: 'EXPIRED' } }),
        this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }),
      ]);

      const grossRevMonth = revenueMonth._sum.totalAmount?.toNumber() ?? 0;
      const grossRevLastMonth = revenueLastMonth._sum.totalAmount?.toNumber() ?? 0;
      const revGrowth = grossRevLastMonth > 0
        ? ((grossRevMonth - grossRevLastMonth) / grossRevLastMonth) * 100
        : 0;

      return {
        users: { total: totalUsers, newToday: newUsersToday, newThisMonth: newUsersMonth },
        spaces: { total: totalSpaces, active: activeSpaces, pendingApproval },
        bookings: {
          total: totalBookings, today: bookingsToday, thisMonth: bookingsMonth,
          completed: completedBookings, cancelled: cancelledBookings, expired: expiredBookings,
          completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0',
          cancellationRate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : '0',
        },
        revenue: {
          total: revenueTotal._sum.totalAmount?.toNumber() ?? 0,
          thisMonth: grossRevMonth,
          lastMonth: grossRevLastMonth,
          growth: revGrowth.toFixed(1),
          platformCommission: parseFloat(((revenueTotal._sum.totalAmount?.toNumber() ?? 0) * 0.15).toFixed(2)),
        },
        disputes: { pending: pendingDisputes },
      };
    });
  }

  // ─── Revenue Time-Series ───────────────────────────────────────────────────

  async getRevenueSeries(granularity: Granularity = 'daily', days = 30) {
    return this.cached(`admin:analytics:revenue:${granularity}:${days}`, async () => {
      const from = new Date(Date.now() - days * 86400000);

      const bookings = await this.prisma.booking.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: from } },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      return this.bucketByTime(
        bookings.map((b) => ({ date: b.createdAt, amount: b.totalAmount.toNumber() })),
        granularity,
      );
    });
  }

  // ─── Booking Analytics ─────────────────────────────────────────────────────

  async getBookingAnalytics(days = 30) {
    return this.cached(`admin:analytics:bookings:${days}`, async () => {
      const from = new Date(Date.now() - days * 86400000);

      const [byStatus, byPaymentMethod, byVehicleType, topSpaces] = await Promise.all([
        this.prisma.booking.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from }, deletedAt: null },
          _count: { id: true },
        }),
        this.prisma.booking.groupBy({
          by: ['paymentMethod'],
          where: { createdAt: { gte: from }, deletedAt: null },
          _count: { id: true },
        }),
        this.prisma.booking.groupBy({
          by: ['vehicleType'],
          where: { createdAt: { gte: from }, deletedAt: null },
          _count: { id: true },
        }),
        // Top 10 spaces by booking count
        this.prisma.parkingSpace.findMany({
          where: { deletedAt: null },
          orderBy: { totalBookings: 'desc' },
          take: 10,
          select: {
            id: true, name: true, city: true,
            totalBookings: true, totalRevenue: true, avgRating: true,
          },
        }),
      ]);

      return {
        byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: r._count.id }), {}),
        byPaymentMethod: byPaymentMethod.reduce((acc, r) => ({ ...acc, [r.paymentMethod ?? 'UNKNOWN']: r._count.id }), {}),
        byVehicleType: byVehicleType.reduce((acc, r) => ({ ...acc, [r.vehicleType]: r._count.id }), {}),
        topSpaces: topSpaces.map((s) => ({
          ...s,
          totalRevenue: s.totalRevenue.toNumber(),
        })),
      };
    });
  }

  // ─── Revenue by City ───────────────────────────────────────────────────────

  async getRevenueByCity() {
    return this.cached('admin:analytics:revenue:city', async () => {
      const spaces = await this.prisma.parkingSpace.groupBy({
        by: ['city'],
        where: { deletedAt: null },
        _sum: { totalRevenue: true, totalBookings: true },
        _count: { id: true },
        orderBy: { _sum: { totalRevenue: 'desc' } },
      });

      return spaces.map((s) => ({
        city: s.city,
        spaces: s._count.id,
        totalBookings: s._sum.totalBookings ?? 0,
        totalRevenue: s._sum.totalRevenue?.toNumber() ?? 0,
        commission: parseFloat(((s._sum.totalRevenue?.toNumber() ?? 0) * 0.15).toFixed(2)),
      }));
    });
  }

  // ─── Occupancy Rate ────────────────────────────────────────────────────────

  async getOccupancyMetrics() {
    return this.cached('admin:analytics:occupancy', async () => {
      const spaces = await this.prisma.parkingSpace.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true, city: true, totalSlots: true, availableSlots: true },
      });

      const overall = spaces.reduce(
        (acc, s) => ({
          totalSlots: acc.totalSlots + s.totalSlots,
          occupiedSlots: acc.occupiedSlots + (s.totalSlots - s.availableSlots),
        }),
        { totalSlots: 0, occupiedSlots: 0 },
      );

      return {
        overallOccupancyRate: overall.totalSlots > 0
          ? parseFloat(((overall.occupiedSlots / overall.totalSlots) * 100).toFixed(1))
          : 0,
        totalSlots: overall.totalSlots,
        occupiedSlots: overall.occupiedSlots,
        spaceBreakdown: spaces.map((s) => ({
          ...s,
          occupancyRate: s.totalSlots > 0
            ? parseFloat((((s.totalSlots - s.availableSlots) / s.totalSlots) * 100).toFixed(1))
            : 0,
        })),
      };
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private bucketByTime(
    items: { date: Date; amount: number }[],
    granularity: Granularity,
  ): { period: string; revenue: number; commission: number; count: number }[] {
    const buckets = new Map<string, { revenue: number; count: number }>();

    for (const item of items) {
      const key = this.periodKey(item.date, granularity);
      const existing = buckets.get(key) ?? { revenue: 0, count: 0 };
      buckets.set(key, { revenue: existing.revenue + item.amount, count: existing.count + 1 });
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, { revenue, count }]) => ({
        period,
        revenue: parseFloat(revenue.toFixed(2)),
        commission: parseFloat((revenue * 0.15).toFixed(2)),
        count,
      }));
  }

  private periodKey(date: Date, granularity: Granularity): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (granularity === 'daily') return `${y}-${m}-${d}`;
    if (granularity === 'monthly') return `${y}-${m}`;
    // weekly: ISO week
    const startOfYear = new Date(y, 0, 1);
    const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2, '0')}`;
  }
}
