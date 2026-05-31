import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(userId: string, page: number, limit: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException();

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId: wallet.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { data, total };
  }

  async creditCoins(userId: string, coins: number, description: string, reference?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { userId },
        data: { coinBalance: { increment: coins } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOPUP',
          amount: 0,
          coins,
          description,
          reference,
          balanceBefore: wallet.coinBalance,
          balanceAfter: updated.coinBalance,
        },
      });

      return updated;
    });
  }

  async deductCoins(userId: string, coins: number, description: string, reference?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.coinBalance < coins) throw new BadRequestException('Insufficient coins');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { userId },
        data: { coinBalance: { decrement: coins } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'BOOKING_PAYMENT',
          amount: 0,
          coins: -coins,
          description,
          reference,
          balanceBefore: wallet.coinBalance,
          balanceAfter: updated.coinBalance,
        },
      });

      return updated;
    });
  }

  async creditEarnings(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { userId },
        data: {
          bdtBalance: { increment: amount },
          totalEarned: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARNINGS_CREDIT',
          amount,
          coins: 0,
          description,
          reference,
          balanceBefore: wallet.bdtBalance,
          balanceAfter: updated.bdtBalance,
        },
      });

      return updated;
    });
  }
}
