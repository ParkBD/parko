import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CommissionService } from '../commission/commission.service';

@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commission: CommissionService,
  ) {}

  async holdForBooking(bookingId: string, driverId: string, ownerId: string, coins: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: driverId },
        select: { id: true, coinBalance: true, escrowBalance: true },
      });
      if (!wallet) throw new NotFoundException('Driver wallet not found');
      if (wallet.coinBalance < coins) throw new BadRequestException('Insufficient coin balance');

      const { platformFee, ownerEarnings } = this.commission.compute(coins);

      await tx.wallet.update({
        where: { userId: driverId },
        data: { coinBalance: { decrement: coins }, escrowBalance: { increment: coins } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'ESCROW_HOLD',
          status: 'PENDING',
          amount: coins,
          balanceBefore: wallet.coinBalance,
          balanceAfter: wallet.coinBalance - coins,
          referenceType: 'BOOKING',
          referenceId: bookingId,
          description: 'Escrow hold for booking',
        },
      });

      return tx.escrow.create({
        data: { bookingId, driverId, ownerId, totalCoins: coins, platformFee, ownerEarnings, status: 'HELD' },
      });
    });
  }

  async releaseOnComplete(bookingId: string, actualCoins: number) {
    return this.prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.findUnique({ where: { bookingId } });
      if (!escrow) throw new NotFoundException('Escrow not found');
      if (escrow.status !== 'HELD')
        throw new BadRequestException(`Escrow is ${escrow.status}, expected HELD`);

      const { platformFee, ownerEarnings } = this.commission.compute(actualCoins);
      const refundToDriver = escrow.totalCoins - actualCoins;

      if (refundToDriver > 0) {
        const driverWallet = await tx.wallet.findUnique({
          where: { userId: escrow.driverId },
          select: { id: true, coinBalance: true, escrowBalance: true },
        });
        await tx.wallet.update({
          where: { userId: escrow.driverId },
          data: { escrowBalance: { decrement: escrow.totalCoins }, coinBalance: { increment: refundToDriver } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: driverWallet!.id,
            type: 'REFUND',
            status: 'COMPLETED',
            amount: refundToDriver,
            balanceBefore: driverWallet!.coinBalance,
            balanceAfter: driverWallet!.coinBalance + refundToDriver,
            referenceType: 'BOOKING',
            referenceId: bookingId,
            description: 'Booking overpayment refund',
            processedAt: new Date(),
          },
        });
      } else {
        await tx.wallet.update({
          where: { userId: escrow.driverId },
          data: { escrowBalance: { decrement: escrow.totalCoins } },
        });
      }

      const ownerWallet = await tx.wallet.findUnique({
        where: { userId: escrow.ownerId },
        select: { id: true, coinBalance: true },
      });
      if (!ownerWallet) throw new NotFoundException('Owner wallet not found');

      await tx.wallet.update({
        where: { userId: escrow.ownerId },
        data: { coinBalance: { increment: ownerEarnings }, totalEarned: { increment: ownerEarnings } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: ownerWallet.id,
          type: 'ESCROW_RELEASE',
          status: 'COMPLETED',
          amount: ownerEarnings,
          balanceBefore: ownerWallet.coinBalance,
          balanceAfter: ownerWallet.coinBalance + ownerEarnings,
          referenceType: 'BOOKING',
          referenceId: bookingId,
          description: 'Parking earnings released',
          processedAt: new Date(),
        },
      });

      const platformUserId = process.env.PLATFORM_WALLET_USER_ID;
      if (platformUserId) {
        const platformWallet = await tx.wallet.findUnique({
          where: { userId: platformUserId },
          select: { id: true, coinBalance: true },
        });
        if (platformWallet) {
          await tx.wallet.update({
            where: { userId: platformUserId },
            data: { coinBalance: { increment: platformFee }, totalEarned: { increment: platformFee } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: platformWallet.id,
              type: 'COMMISSION',
              status: 'COMPLETED',
              amount: platformFee,
              balanceBefore: platformWallet.coinBalance,
              balanceAfter: platformWallet.coinBalance + platformFee,
              referenceType: 'BOOKING',
              referenceId: bookingId,
              description: '15% platform commission',
              processedAt: new Date(),
            },
          });
        }
      }

      return tx.escrow.update({
        where: { bookingId },
        data: { status: 'RELEASED', platformFee, ownerEarnings, refundedCoins: refundToDriver > 0 ? refundToDriver : 0, releasedAt: new Date() },
      });
    });
  }

  async refundOnCancel(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.findUnique({ where: { bookingId } });
      if (!escrow) throw new NotFoundException('Escrow not found');
      if (escrow.status !== 'HELD')
        throw new BadRequestException(`Cannot refund: escrow is ${escrow.status}`);

      const driverWallet = await tx.wallet.findUnique({
        where: { userId: escrow.driverId },
        select: { id: true, coinBalance: true, escrowBalance: true },
      });
      if (!driverWallet) throw new NotFoundException('Driver wallet not found');

      await tx.wallet.update({
        where: { userId: escrow.driverId },
        data: { coinBalance: { increment: escrow.totalCoins }, escrowBalance: { decrement: escrow.totalCoins } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: driverWallet.id,
          type: 'REFUND',
          status: 'COMPLETED',
          amount: escrow.totalCoins,
          balanceBefore: driverWallet.coinBalance,
          balanceAfter: driverWallet.coinBalance + escrow.totalCoins,
          referenceType: 'BOOKING',
          referenceId: bookingId,
          description: 'Booking cancellation refund',
          processedAt: new Date(),
        },
      });

      return tx.escrow.update({
        where: { bookingId },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });
    });
  }

  async getByBooking(bookingId: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { bookingId } });
    if (!escrow) throw new NotFoundException('Escrow not found');
    return escrow;
  }
}
