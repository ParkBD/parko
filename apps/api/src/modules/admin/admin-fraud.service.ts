import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

const CACHE_TTL = 120; // fraud signals refresh every 2 min

export interface FraudSignal {
  userId: string;
  email: string;
  riskScore: number;           // 0–100
  signals: string[];
  detectedAt: Date;
}

@Injectable()
export class AdminFraudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Aggregated Fraud Report ───────────────────────────────────────────────

  async getFraudReport(): Promise<{ signals: FraudSignal[]; generatedAt: Date }> {
    const cacheKey = 'admin:fraud:report';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      cancellationFarmers,
      codeAbusers,
      paymentFailurers,
      largeWalletCredits,
      multipleRefunds,
    ] = await Promise.all([
      this.detectCancellationFarming(),
      this.detectCodeBruteForce(),
      this.detectRepeatedPaymentFailures(),
      this.detectLargeAdminCredits(),
      this.detectHighRefundRate(),
    ]);

    // Merge signals per user
    const userMap = new Map<string, FraudSignal>();

    const merge = (signals: Array<{ userId: string; email: string; signal: string; score: number }>) => {
      for (const s of signals) {
        const existing = userMap.get(s.userId) ?? {
          userId: s.userId, email: s.email, riskScore: 0, signals: [], detectedAt: new Date(),
        };
        existing.riskScore = Math.min(100, existing.riskScore + s.score);
        existing.signals.push(s.signal);
        userMap.set(s.userId, existing);
      }
    };

    merge(cancellationFarmers);
    merge(codeAbusers);
    merge(paymentFailurers);
    merge(largeWalletCredits);
    merge(multipleRefunds);

    const result = {
      signals: Array.from(userMap.values()).sort((a, b) => b.riskScore - a.riskScore),
      generatedAt: new Date(),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  // ─── Signal: Cancellation Farming (book → reserve → cancel to get refunds) ─

  private async detectCancellationFarming() {
    const since = new Date(Date.now() - 30 * 86400000);

    const users = await this.prisma.booking.groupBy({
      by: ['driverId'],
      where: {
        status: 'CANCELLED',
        createdAt: { gte: since },
        paymentStatus: 'REFUNDED' as any,
      },
      _count: { id: true },
      having: { id: { _count: { gt: 3 } } },
    });

    const driverIds = users.map((u) => u.driverId);
    if (!driverIds.length) return [];

    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, email: true },
    });
    const emailMap = new Map(drivers.map((d) => [d.id, d.email]));

    return users.map((u) => ({
      userId: u.driverId,
      email: emailMap.get(u.driverId) ?? 'unknown',
      signal: `Cancelled ${u._count.id} paid bookings in 30 days (potential refund farming)`,
      score: Math.min(40, u._count.id * 8),
    }));
  }

  // ─── Signal: Verification Code Brute Force ─────────────────────────────────

  private async detectCodeBruteForce() {
    const since = new Date(Date.now() - 24 * 3600000);

    const abused = await this.prisma.verificationCode.findMany({
      where: {
        attempts: { gte: 4 },
        createdAt: { gte: since },
      },
      select: {
        userId: true, attempts: true, maxAttempts: true,
        user: { select: { email: true } },
      },
    });

    return abused.map((vc) => ({
      userId: vc.userId,
      email: vc.user.email,
      signal: `${vc.attempts}/${vc.maxAttempts} code attempts in 24h (brute force indicator)`,
      score: 30,
    }));
  }

  // ─── Signal: Repeated Payment Failures ────────────────────────────────────

  private async detectRepeatedPaymentFailures() {
    const since = new Date(Date.now() - 7 * 86400000);

    const failed = await this.prisma.booking.groupBy({
      by: ['driverId'],
      where: {
        paymentStatus: 'FAILED' as any,
        createdAt: { gte: since },
      },
      _count: { id: true },
      having: { id: { _count: { gt: 2 } } },
    });

    const driverIds = failed.map((f) => f.driverId);
    if (!driverIds.length) return [];

    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, email: true },
    });
    const emailMap = new Map(drivers.map((d) => [d.id, d.email]));

    return failed.map((f) => ({
      userId: f.driverId,
      email: emailMap.get(f.driverId) ?? 'unknown',
      signal: `${f._count.id} payment failures in 7 days`,
      score: 25,
    }));
  }

  // ─── Signal: Large Admin Wallet Credits (potential insider abuse) ──────────

  private async detectLargeAdminCredits() {
    const since = new Date(Date.now() - 7 * 86400000);
    const THRESHOLD = 500; // flag credits over $500

    const credits = await this.prisma.walletTransaction.findMany({
      where: {
        type: 'ADMIN_CREDIT' as any,
        amount: { gte: THRESHOLD },
        createdAt: { gte: since },
      },
      select: {
        userId: true, amount: true,
        user: { select: { email: true } },
      },
    });

    return credits.map((c) => ({
      userId: c.userId,
      email: c.user.email,
      signal: `Large admin credit of $${c.amount.toNumber().toFixed(2)} in last 7 days`,
      score: 20,
    }));
  }

  // ─── Signal: High Refund Rate Users ───────────────────────────────────────

  private async detectHighRefundRate() {
    const since = new Date(Date.now() - 30 * 86400000);

    const users = await this.prisma.booking.groupBy({
      by: ['driverId'],
      where: { createdAt: { gte: since }, deletedAt: null },
      _count: { id: true },
    });

    const cancelled = await this.prisma.booking.groupBy({
      by: ['driverId'],
      where: {
        createdAt: { gte: since },
        status: 'CANCELLED',
        deletedAt: null,
      },
      _count: { id: true },
    });

    const cancelMap = new Map(cancelled.map((c) => [c.driverId, c._count.id]));

    // Users with >60% cancellation rate and at least 5 total bookings
    const highRisk = users.filter((u) => {
      const cancelCount = cancelMap.get(u.driverId) ?? 0;
      return u._count.id >= 5 && cancelCount / u._count.id > 0.6;
    });

    if (!highRisk.length) return [];

    const driverIds = highRisk.map((u) => u.driverId);
    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, email: true },
    });
    const emailMap = new Map(drivers.map((d) => [d.id, d.email]));

    return highRisk.map((u) => {
      const cancelCount = cancelMap.get(u.driverId) ?? 0;
      const rate = ((cancelCount / u._count.id) * 100).toFixed(0);
      return {
        userId: u.driverId,
        email: emailMap.get(u.driverId) ?? 'unknown',
        signal: `${rate}% cancellation rate (${cancelCount}/${u._count.id} bookings in 30 days)`,
        score: 35,
      };
    });
  }
}
