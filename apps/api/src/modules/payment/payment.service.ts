import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { SSLCommerzService } from './sslcommerz.service';
import { QUEUES } from '@infrastructure/queue/queue.module';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private sslcommerz: SSLCommerzService,
    private configService: ConfigService,
    @InjectQueue(QUEUES.NOTIFICATION) private notificationQueue: Queue,
  ) {}

  async initiatePayment(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        driver: true,
        lot: { select: { name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driverId !== userId) throw new BadRequestException('Unauthorized');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    let remainingAmount = booking.totalAmount;
    let coinsUsed = 0;

    // Apply coins if requested
    if (booking.coinsUsed > 0 && wallet) {
      const coinValue = booking.coinsUsed * this.configService.get<number>('app.coinToBdtRate', 1);
      coinsUsed = Math.min(booking.coinsUsed, wallet.coinBalance);
      remainingAmount = Math.max(0, booking.totalAmount - coinValue);
    }

    if (remainingAmount === 0) {
      // Pay fully with coins
      await this.walletService.deductCoins(userId, coinsUsed, `Booking ${booking.bookingRef}`);
      return this.completePayment(bookingId, null, coinsUsed, 0, 'WALLET_COINS');
    }

    // Initiate SSLCommerz
    const tranId = uuidv4();
    const session = await this.sslcommerz.initPayment({
      amount: remainingAmount,
      currency: 'BDT',
      tranId,
      customerName: `${booking.driver.firstName} ${booking.driver.lastName}`,
      customerEmail: booking.driver.email,
      customerPhone: booking.driver.phone ?? '01700000000',
      productName: `Parking: ${booking.lot.name}`,
      productCategory: 'parking',
    });

    if (session.status !== 'SUCCESS') {
      throw new BadRequestException('Payment gateway error: ' + session.failedreason);
    }

    // Save pending payment
    await this.prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: remainingAmount,
        method: coinsUsed > 0 ? 'MIXED' : 'SSLCOMMERZ',
        status: 'PENDING',
        gatewayTxId: tranId,
        coinsDeducted: coinsUsed,
      },
      update: {
        gatewayTxId: tranId,
        status: 'PENDING',
      },
    });

    return { gatewayUrl: session.GatewayPageURL, tranId };
  }

  async handlePaymentSuccess(valId: string, tranId: string) {
    const isValid = await this.sslcommerz.validatePayment(valId);
    if (!isValid) throw new BadRequestException('Invalid payment');

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayTxId: tranId },
      include: { booking: { include: { lot: true } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    await this.completePayment(
      payment.bookingId,
      tranId,
      payment.coinsDeducted,
      payment.amount,
      payment.method,
    );
  }

  private async completePayment(
    bookingId: string,
    gatewayTxId: string | null,
    coinsUsed: number,
    amount: number,
    method: string,
  ) {
    const platformFeePercent = this.configService.get<number>('app.platformFeePercent', 10);
    const platformFee = (amount * platformFeePercent) / 100;
    const ownerEarnings = amount - platformFee;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { lot: { select: { ownerId: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          amount,
          method: method as any,
          status: 'COMPLETED',
          gatewayTxId,
          coinsDeducted: coinsUsed,
          platformFee,
          ownerEarnings,
          processedAt: new Date(),
        },
        update: {
          status: 'COMPLETED',
          processedAt: new Date(),
          gatewayTxId,
          platformFee,
          ownerEarnings,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', paymentStatus: 'COMPLETED', paymentMethod: method as any },
      });
    });

    // Credit owner earnings
    if (ownerEarnings > 0 && booking?.lot.ownerId) {
      await this.walletService.creditEarnings(
        booking.lot.ownerId,
        ownerEarnings,
        `Booking earnings: ${bookingId}`,
        bookingId,
      );
    }

    await this.notificationQueue.add('payment.confirmed', { bookingId });
    return { success: true };
  }
}
