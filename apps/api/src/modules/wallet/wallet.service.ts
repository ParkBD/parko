import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CoinPackage, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { BuyCoinsDto } from './dto/buy-coins.dto';

const COINS_CONFIG: Record<CoinPackage, { coins: number; price: number }> = {
  STARTER:    { coins: 100,   price: 50 },
  BASIC:      { coins: 500,   price: 200 },
  STANDARD:   { coins: 1000,  price: 350 },
  PREMIUM:    { coins: 5000,  price: 1500 },
  ENTERPRISE: { coins: 10000, price: 2500 },
};

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      id: wallet.id,
      balance: wallet.balance.toNumber(),
      coinBalance: wallet.coinBalance,
      totalEarned: wallet.totalEarned.toNumber(),
      totalSpent: wallet.totalSpent.toNumber(),
      totalWithdrawn: wallet.totalWithdrawn.toNumber(),
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20, type?: WalletTransactionType) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    const skip = (page - 1) * limit;
    const where = { walletId: wallet.id, ...(type ? { type } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return {
      data: data.map((t) => ({ ...t, amount: t.amount.toNumber(), balanceBefore: t.balanceBefore.toNumber(), balanceAfter: t.balanceAfter.toNumber() })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async creditWallet(
    userId: string,
    amount: number,
    type: WalletTransactionType,
    opts?: { description?: string; referenceType?: string; referenceId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId }, select: { id: true, balance: true } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const before = wallet.balance.toNumber();
      const after = before + amount;
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount }, totalEarned: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, type, status: 'COMPLETED',
          amount, balanceBefore: before, balanceAfter: after,
          description: opts?.description, referenceType: opts?.referenceType,
          referenceId: opts?.referenceId, processedAt: new Date(),
        },
      });
      return after;
    });
  }

  async debitWallet(
    userId: string,
    amount: number,
    type: WalletTransactionType,
    opts?: { description?: string; referenceType?: string; referenceId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId }, select: { id: true, balance: true } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const before = wallet.balance.toNumber();
      if (before < amount) throw new BadRequestException('Insufficient balance');
      const after = before - amount;
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount }, totalSpent: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, type, status: 'COMPLETED',
          amount, balanceBefore: before, balanceAfter: after,
          description: opts?.description, referenceType: opts?.referenceType,
          referenceId: opts?.referenceId, processedAt: new Date(),
        },
      });
      return after;
    });
  }

  async buyCoinPackage(userId: string, dto: BuyCoinsDto) {
    const config = COINS_CONFIG[dto.package];
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true, balance: true, coinBalance: true } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balance.toNumber() < config.price) throw new BadRequestException('Insufficient balance');

    return this.prisma.$transaction(async (tx) => {
      const before = wallet.balance.toNumber();
      const after = before - config.price;
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: config.price }, coinBalance: { increment: config.coins }, totalSpent: { increment: config.price } },
      });
      await tx.coinPurchase.create({
        data: { walletId: wallet.id, package: dto.package, coinsAmount: config.coins, priceAmount: config.price, currency: 'BDT', paymentMethod: dto.paymentMethod, paymentStatus: 'COMPLETED', processedAt: new Date() },
      });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, type: 'COIN_PURCHASE', status: 'COMPLETED', amount: config.price, balanceBefore: before, balanceAfter: after, description: `Bought ${config.coins} coins`, processedAt: new Date() },
      });
      return { coinsAdded: config.coins, newCoinBalance: wallet.coinBalance + config.coins };
    });
  }

  async getCoinPurchases(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
    if (!wallet) throw new NotFoundException();
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.coinPurchase.findMany({ where: { walletId: wallet.id }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.coinPurchase.count({ where: { walletId: wallet.id } }),
    ]);
    return { data: data.map((p) => ({ ...p, priceAmount: p.priceAmount.toNumber() })), total, page, limit };
  }
}
