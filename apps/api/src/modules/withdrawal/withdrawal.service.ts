import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Injectable()
export class WithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWithdrawalDto) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, coinBalance: true, escrowBalance: true, pendingWithdraw: true },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const available = wallet.coinBalance - wallet.escrowBalance - wallet.pendingWithdraw;
      if (available < dto.amount) {
        throw new BadRequestException(`Insufficient available balance. Available: ${available} coins`);
      }

      const existing = await tx.withdrawalRequest.findFirst({
        where: { userId, status: 'PENDING' },
      });
      if (existing) throw new BadRequestException('You already have a pending withdrawal request');

      await tx.wallet.update({
        where: { userId },
        data: { coinBalance: { decrement: dto.amount }, pendingWithdraw: { increment: dto.amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          amount: dto.amount,
          balanceBefore: wallet.coinBalance,
          balanceAfter: wallet.coinBalance - dto.amount,
          description: `Withdrawal request via ${dto.method}`,
        },
      });

      return tx.withdrawalRequest.create({
        data: {
          userId,
          walletId: wallet.id,
          amount: dto.amount,
          method: dto.method,
          accountDetails: dto.accountDetails as object,
          status: 'PENDING',
        },
      });
    });
  }

  async listMine(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(userId: string, id: string) {
    const req = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Withdrawal request not found');
    if (req.userId !== userId) throw new ForbiddenException();
    return req;
  }

  async cancel(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!req) throw new NotFoundException('Withdrawal request not found');
      if (req.userId !== userId) throw new ForbiddenException();
      if (req.status !== 'PENDING') {
        throw new BadRequestException(`Cannot cancel: request is ${req.status}`);
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, coinBalance: true, pendingWithdraw: true },
      });

      await tx.wallet.update({
        where: { userId },
        data: { coinBalance: { increment: req.amount }, pendingWithdraw: { decrement: req.amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: 'WITHDRAWAL',
          status: 'REVERSED',
          amount: req.amount,
          balanceBefore: wallet!.coinBalance,
          balanceAfter: wallet!.coinBalance + req.amount,
          description: 'Withdrawal request cancelled by user',
          processedAt: new Date(),
        },
      });

      return tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'REJECTED', adminNote: 'Self-cancelled by user' },
      });
    });
  }
}
