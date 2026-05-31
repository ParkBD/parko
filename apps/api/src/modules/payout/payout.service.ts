import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { RequestPayoutDto } from './dto/request-payout.dto';

@Injectable()
export class PayoutService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @InjectQueue(QUEUES.WITHDRAWAL) private withdrawalQueue: Queue,
  ) {}

  async requestPayout(userId: string, dto: RequestPayoutDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true, balance: true } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balance.toNumber() < dto.amount) throw new BadRequestException('Insufficient balance');

    const pending = await this.prisma.ownerPayout.findFirst({
      where: { walletId: wallet.id, status: { in: ['PENDING', 'PROCESSING'] } },
    });
    if (pending) throw new BadRequestException('You already have a pending payout');

    await this.walletService.debitWallet(userId, dto.amount, 'WITHDRAWAL', { description: 'Payout request' });

    const payout = await this.prisma.ownerPayout.create({
      data: {
        walletId: wallet.id,
        amount: dto.amount,
        method: dto.method,
        status: 'PENDING',
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        routingNumber: dto.routingNumber,
        mobileNumber: dto.mobileNumber,
        notes: dto.notes,
      },
    });

    await this.withdrawalQueue.add('payout.requested', { payoutId: payout.id });
    return { ...payout, amount: payout.amount.toNumber() };
  }

  async getMyPayouts(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
    if (!wallet) throw new NotFoundException();
    const skip = (page - 1) * limit;
    const where = { walletId: wallet.id };
    const [data, total] = await Promise.all([
      this.prisma.ownerPayout.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.ownerPayout.count({ where }),
    ]);
    return { data: data.map((p) => ({ ...p, amount: p.amount.toNumber() })), total, page, limit };
  }

  async getAllPayouts(page = 1, limit = 20, status?: PayoutStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.ownerPayout.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { wallet: { include: { user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } } } } },
      }),
      this.prisma.ownerPayout.count({ where }),
    ]);
    return { data: data.map((p) => ({ ...p, amount: p.amount.toNumber() })), total, page, limit };
  }

  async processPayout(payoutId: string, adminId: string, action: 'approve' | 'reject', reason?: string) {
    const payout = await this.prisma.ownerPayout.findUnique({
      where: { id: payoutId },
      include: { wallet: { select: { userId: true } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'PENDING') throw new BadRequestException('Payout is not pending');

    if (action === 'reject') {
      await this.prisma.ownerPayout.update({
        where: { id: payoutId },
        data: { status: 'CANCELLED', failureReason: reason },
      });
      // Refund wallet
      await this.walletService.creditWallet(payout.wallet.userId, payout.amount.toNumber(), 'REFUND', { description: 'Payout rejected', referenceType: 'payout', referenceId: payoutId });
    } else {
      await this.prisma.ownerPayout.update({
        where: { id: payoutId },
        data: { status: 'COMPLETED', processedAt: new Date(), processedBy: adminId },
      });
      await this.prisma.wallet.update({
        where: { userId: payout.wallet.userId },
        data: { totalWithdrawn: { increment: payout.amount.toNumber() } },
      });
    }

    return { success: true, action };
  }
}
