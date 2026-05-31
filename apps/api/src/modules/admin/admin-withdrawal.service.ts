import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class AdminWithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status?: WithdrawalStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOne(id: string) {
    const req = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } },
    });
    if (!req) throw new NotFoundException('Withdrawal request not found');
    return req;
  }

  async approve(adminId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!req) throw new NotFoundException('Withdrawal request not found');
      if (req.status !== 'PENDING')
        throw new BadRequestException(`Cannot approve: status is ${req.status}`);

      return tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: adminId, processedAt: new Date() },
      });
    });
  }

  async reject(adminId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!req) throw new NotFoundException('Withdrawal request not found');
      if (!(['PENDING', 'APPROVED'] as WithdrawalStatus[]).includes(req.status))
        throw new BadRequestException(`Cannot reject: status is ${req.status}`);

      const wallet = await tx.wallet.findUnique({
        where: { id: req.walletId },
        select: { id: true, coinBalance: true, pendingWithdraw: true },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      await tx.wallet.update({
        where: { id: req.walletId },
        data: { coinBalance: { increment: req.amount }, pendingWithdraw: { decrement: req.amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: req.walletId,
          type: 'WITHDRAWAL',
          status: 'REVERSED',
          amount: req.amount,
          balanceBefore: wallet.coinBalance,
          balanceAfter: wallet.coinBalance + req.amount,
          description: `Withdrawal rejected: ${reason}`,
          processedAt: new Date(),
        },
      });

      return tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason, reviewedBy: adminId },
      });
    });
  }

  async complete(adminId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!req) throw new NotFoundException('Withdrawal request not found');
      if (!(['APPROVED', 'PROCESSING'] as WithdrawalStatus[]).includes(req.status))
        throw new BadRequestException(`Cannot complete: status is ${req.status}`);

      const wallet = await tx.wallet.findUnique({
        where: { id: req.walletId },
        select: { id: true, pendingWithdraw: true },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      await tx.wallet.update({
        where: { id: req.walletId },
        data: {
          pendingWithdraw: { decrement: req.amount },
          totalWithdrawn: { increment: req.amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: req.walletId,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amount: req.amount,
          balanceBefore: 0,
          balanceAfter: 0,
          description: 'Withdrawal completed by admin',
          processedAt: new Date(),
        },
      });

      return tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'COMPLETED', reviewedBy: adminId, completedAt: new Date() },
      });
    });
  }
}
