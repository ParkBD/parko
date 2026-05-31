import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { EscrowService } from '@modules/escrow/escrow.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { SLOT_OCCUPYING_STATES } from './booking-state-machine';

export interface BookingExpireJobData {
  bookingId: string;
  expectedStatus: 'PENDING' | 'RESERVED';
  reason: 'NO_PAYMENT' | 'NO_ARRIVAL';
}

@Processor(QUEUES.BOOKING)
export class BookingExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpiryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly escrowService: EscrowService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'booking.expire') {
      await this.handleExpiry(job.data as BookingExpireJobData);
    }
  }

  private async handleExpiry(data: BookingExpireJobData): Promise<void> {
    const { bookingId, expectedStatus, reason } = data;

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { space: { select: { pricePerHour: true, ownerId: true } } },
    });

    if (!booking || booking.status !== expectedStatus) {
      // Booking already transitioned — nothing to do (idempotent)
      this.logger.debug(`Skip expire for ${bookingId}: status is ${booking?.status ?? 'not found'}`);
      return;
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.EXPIRED,
          expiredAt: now,
          expiryReason: reason,
        },
      });

      // Release the slot if it was occupying one
      if (SLOT_OCCUPYING_STATES.includes(booking.status)) {
        await tx.parkingSpace.update({
          where: { id: booking.spaceId },
          data: { availableSlots: { increment: 1 } },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.EXPIRED,
          reason,
          metadata: { source: 'expiry_processor' },
        },
      });
    });

    // Refund on RESERVED expiry (payment was already collected)
    if (expectedStatus === BookingStatus.RESERVED) {
      try {
        if (booking.paymentMethod === 'COINS') {
          await this.escrowService.refundOnCancel(bookingId);
        } else if (booking.paymentMethod === 'WALLET') {
          await this.walletService.creditWallet(
            booking.driverId,
            booking.totalAmount.toNumber(),
            'REFUND',
            { description: 'Booking expired — full refund', referenceType: 'booking', referenceId: bookingId },
          );
        }
      } catch (err) {
        this.logger.error(`Refund failed for expired booking ${bookingId}`, err);
      }
    }

    this.logger.log(`Booking ${bookingId} expired (${reason})`);
  }
}
