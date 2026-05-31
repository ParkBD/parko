import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { QUEUES } from '@infrastructure/queue/queue.module';

const MIN_WITHDRAWAL = 500;

@Injectable()
export class WithdrawalService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @InjectQueue(QUEUES.WITHDRAWAL) private withdrawalQueue: Queue,
  ) {}

  async requestWithdrawal(userId: string, amount: number, method: string, accountDetails: any) {
    if (amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(`Minimum withdrawal is ${MIN_WITHDRAWAL} BDT`);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.bdtBalance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const pending = await this.prisma.withdrawal.findFirst({
      where: { userId, status: { in: ['PENDING', 'PROCESSING'] } },
    });
    if (pending) throw new BadRequestException('You already have a pending withdrawal');

    // Deduct balance immediately (hold funds)
    await this.prisma.wallet.update({
      where: { userId },
      data: { bdtBalance: { decrement: amount } },
    });

    const withdrawal = await this.prisma.withdrawal.create({
      data: { userId, amount, method, accountDetails },
    });

    await this.withdrawalQueue.add('withdrawal.requested', {
      withdrawalId: withdrawal.id,
    });

    return withdrawal;
  }

  async approveWithdrawal(withdrawalId: string, adminId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Not pending');

    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'PROCESSING', processedBy: adminId },
    });

    return { message: 'Withdrawal approved and processing' };
  }

  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException();
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Not pending');

    // Refund balance
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: { bdtBalance: { increment: withdrawal.amount } },
      });
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED', rejectionReason: reason, processedBy: adminId },
      });
    });

    return { message: 'Withdrawal rejected and balance refunded' };
  }

  async getUserWithdrawals(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]);
    return { data, total };
  }

  async getAdminWithdrawals(status?: string, page = 1, limit = 20) {
    const where: any = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    return { data, total };
  }
}
