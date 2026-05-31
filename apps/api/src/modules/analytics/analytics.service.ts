import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOwnerDashboard(ownerId: string) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const lotIds = lots.map((l) => l.id);

    const [totalBookings, totalRevenue, activeBookings, lotStats] = await Promise.all([
      this.prisma.booking.count({ where: { lotId: { in: lotIds } } }),
      this.prisma.payment.aggregate({
        where: { booking: { lotId: { in: lotIds } }, status: 'COMPLETED' },
        _sum: { ownerEarnings: true },
      }),
      this.prisma.booking.count({
        where: { lotId: { in: lotIds }, status: 'ACTIVE' },
      }),
      this.prisma.lotAnalytics.findMany({
        where: { lotId: { in: lotIds } },
        include: { lot: { select: { name: true } } },
      }),
    ]);

    return {
      totalBookings,
      totalRevenue: totalRevenue._sum.ownerEarnings ?? 0,
      activeBookings,
      lotStats,
    };
  }

  async getOwnerEarnings(ownerId: string, startDate?: Date, endDate?: Date) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const lotIds = lots.map((l) => l.id);

    const where: any = {
      booking: { lotId: { in: lotIds } },
      status: 'COMPLETED',
    };
    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) where.processedAt.gte = startDate;
      if (endDate) where.processedAt.lte = endDate;
    }

    return this.prisma.payment.findMany({
      where,
      select: {
        amount: true,
        ownerEarnings: true,
        platformFee: true,
        processedAt: true,
        booking: {
          select: {
            bookingRef: true,
            startTime: true,
            lot: { select: { name: true } },
          },
        },
      },
      orderBy: { processedAt: 'desc' },
    });
  }

  async getAdminDashboard() {
    const [totalUsers, totalLots, totalBookings, totalRevenue, pendingLots, pendingWithdrawals] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.parkingLot.count({ where: { status: 'ACTIVE' } }),
        this.prisma.booking.count(),
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { platformFee: true, amount: true },
        }),
        this.prisma.parkingLot.count({ where: { status: 'PENDING_APPROVAL' } }),
        this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      ]);

    return {
      totalUsers,
      totalLots,
      totalBookings,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      platformEarnings: totalRevenue._sum.platformFee ?? 0,
      pendingLots,
      pendingWithdrawals,
    };
  }

  async updateLotAnalytics(lotId: string) {
    const [bookings, revenue, ratings] = await Promise.all([
      this.prisma.booking.count({ where: { lotId, status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({
        where: { booking: { lotId }, status: 'COMPLETED' },
        _sum: { ownerEarnings: true },
      }),
      this.prisma.review.aggregate({
        where: { booking: { lotId } },
        _avg: { rating: true },
      }),
    ]);

    await this.prisma.lotAnalytics.upsert({
      where: { lotId },
      create: {
        lotId,
        totalBookings: bookings,
        totalRevenue: revenue._sum.ownerEarnings ?? 0,
        avgRating: ratings._avg.rating ?? 0,
      },
      update: {
        totalBookings: bookings,
        totalRevenue: revenue._sum.ownerEarnings ?? 0,
        avgRating: ratings._avg.rating ?? 0,
      },
    });
  }
}
