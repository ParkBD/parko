import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

const CACHE_TTL = 300;

@Injectable()
export class AdminWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Wallet List + Overview ────────────────────────────────────────────────

  async listWallets(page = 1, limit = 20, frozen?: boolean, minBalance?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (frozen !== undefined) where.frozenAt = frozen ? { not: null } : null;
    if (minBalance !== undefined) where.balance = { gte: minBalance };

    const [data, total] = await Promise.all([
      this.prisma.wallet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { balance: 'desc' },
        include: {
          user: {
            select: {
              id: true, email: true,
              profile: { select: { firstName: true, lastName: true } },
              status: true,
            },
          },
        },
      }),
      this.prisma.wallet.count({ where }),
    ]);

    return {
      data: data.map((w) => ({
        ...w,
        balance: w.balance.toNumber(),
      })),
      total, page, limit,
    };
  }

  async getWalletDetail(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true, type: true, amount: true, status: true,
            balanceBefore: true, balanceAfter: true,
            description: true, referenceType: true, referenceId: true, createdAt: true,
          },
        },
      },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return {
      ...wallet,
      balance: wallet.balance.toNumber(),
      transactions: wallet.transactions.map((t) => ({
        ...t,
        amount: t.amount.toNumber(),
        balanceBefore: t.balanceBefore.toNumber(),
        balanceAfter: t.balanceAfter.toNumber(),
      })),
    };
  }

  // ─── Freeze / Unfreeze ─────────────────────────────────────────────────────

  async freezeWallet(walletId: string, adminId: string, reason: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (!!wallet.frozenAt) throw new BadRequestException('Wallet is already frozen');

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { id: walletId }, data: { frozenAt: new Date(), frozenReason: reason } });
      await tx.adminAction.create({
        data: { adminId, type: 'FREEZE_WALLET', entityType: 'wallet', entityId: walletId, reason },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId, subjectId: wallet.userId,
          action: 'UPDATE', entityType: 'wallet', entityId: walletId,
          newValues: { isFrozen: true },
          metadata: { reason },
        },
      });
    });

    return { success: true, walletId, frozen: true };
  }

  async unfreezeWallet(walletId: string, adminId: string, reason: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (!wallet.frozenAt) throw new BadRequestException('Wallet is not frozen');

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { id: walletId }, data: { frozenAt: null, frozenReason: null } });
      await tx.adminAction.create({
        data: { adminId, type: 'UNFREEZE_WALLET', entityType: 'wallet', entityId: walletId, reason },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId, subjectId: wallet.userId,
          action: 'UPDATE', entityType: 'wallet', entityId: walletId,
          newValues: { isFrozen: false },
          metadata: { reason },
        },
      });
    });

    return { success: true, walletId, frozen: false };
  }

  // ─── Manual Balance Adjustment ─────────────────────────────────────────────

  async adjustBalance(
    walletId: string,
    adminId: string,
    amount: number,     // positive = credit, negative = debit
    reason: string,
  ) {
    if (amount === 0) throw new BadRequestException('Amount cannot be zero');

    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const currentBalance = wallet.balance.toNumber();
    const newBalance = parseFloat((currentBalance + amount).toFixed(2));
    if (newBalance < 0) throw new BadRequestException('Adjustment would result in negative balance');

    const type = amount > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT';

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { id: walletId }, data: { balance: newBalance } });
      await tx.walletTransaction.create({
        data: {
          walletId,
          type: type as any,
          amount: Math.abs(amount),
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          status: 'COMPLETED',
          description: `Admin adjustment: ${reason}`,
          referenceType: 'admin_action',
        },
      });
      await tx.adminAction.create({
        data: {
          adminId, type: 'ADJUST_WALLET_BALANCE',
          entityType: 'wallet', entityId: walletId,
          reason, metadata: { amount, balanceBefore: currentBalance, balanceAfter: newBalance },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId, subjectId: wallet.userId,
          action: 'UPDATE', entityType: 'wallet', entityId: walletId,
          oldValues: { balance: currentBalance },
          newValues: { balance: newBalance },
          metadata: { reason, adjustment: amount },
        },
      });
    });

    return { success: true, walletId, balanceBefore: currentBalance, balanceAfter: newBalance };
  }

  // ─── Coin Economy Metrics ──────────────────────────────────────────────────

  async getCoinMetrics() {
    const cacheKey = 'admin:coin:metrics';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      totalCirculating,
      topHolders,
      purchaseVolume30d,
      spentVolume30d,
    ] = await Promise.all([
      // Total coins in all wallets
      this.prisma.wallet.aggregate({ _sum: { coinBalance: true } }),

      // Top 10 coin holders
      this.prisma.wallet.findMany({
        where: { coinBalance: { gt: 0 } },
        orderBy: { coinBalance: 'desc' },
        take: 10,
        select: {
          coinBalance: true,
          user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      }),

      // Coins purchased in last 30 days
      this.prisma.coinPurchase.aggregate({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, paymentStatus: 'COMPLETED' as any },
        _sum: { coinsAmount: true },
        _count: { id: true },
      }),

      // Coins spent in bookings in last 30 days
      this.prisma.booking.aggregate({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, coinsUsed: { gt: 0 } },
        _sum: { coinsUsed: true },
        _count: { id: true },
      }),
    ]);

    const result = {
      totalCirculating: totalCirculating._sum.coinBalance ?? 0,
      topHolders: topHolders.map((w) => ({ ...w })),
      last30Days: {
        purchased: purchaseVolume30d._sum.coinsAmount ?? 0,
        purchaseCount: (purchaseVolume30d._count as any)?.id ?? 0,
        spent: spentVolume30d._sum.coinsUsed ?? 0,
        spendCount: spentVolume30d._count.id,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }
}
