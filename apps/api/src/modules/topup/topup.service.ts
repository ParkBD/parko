import * as crypto from 'crypto';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export function validateIpnHash(body: Record<string, string>, storePasswd: string): boolean {
  const received = body.verify_sign;
  if (!received) return false;

  const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

  const params = Object.keys(body)
    .filter((k) => k !== 'verify_sign' && k !== 'verify_key')
    .reduce<Record<string, string>>((acc, k) => { acc[k] = body[k]; return acc; }, {});

  params['store_passwd'] = md5(storePasswd);

  const hashStr = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return md5(hashStr) === received;
}

@Injectable()
export class TopupService {
  private readonly baseUrl: string;
  private readonly storeId: string;
  private readonly storePasswd: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const isSandbox = config.get<string>('SSLCOMMERZ_IS_SANDBOX') === 'true';
    this.baseUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
    this.storeId = config.get<string>('SSLCOMMERZ_STORE_ID')!;
    this.storePasswd = config.get<string>('SSLCOMMERZ_STORE_PASSWORD')!;
  }

  async initiatePayment(userId: string, amount: number) {
    if (amount < 50 || amount > 50000) throw new BadRequestException('Amount must be between 50 and 50,000 BDT');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const tranId = `PARKO-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const apiUrl = this.config.get<string>('API_URL');

    const txn = await this.prisma.paymentGatewayTxn.create({
      data: { userId, walletId: wallet.id, amount, coinsToCredit: amount, tranId, status: 'INITIATED' },
    });

    const payload = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePasswd,
      total_amount: amount.toString(),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${frontendUrl}/wallet/topup/success?tran_id=${tranId}`,
      fail_url: `${frontendUrl}/wallet/topup/fail?tran_id=${tranId}`,
      cancel_url: `${frontendUrl}/wallet/topup/cancel?tran_id=${tranId}`,
      ipn_url: `${apiUrl}/wallet/topup/ipn`,
      product_name: 'Parko Coin Top-up',
      product_category: 'Digital',
      product_profile: 'non-physical-goods',
      shipping_method: 'NO',
      num_of_item: '1',
      cus_name: userId,
      cus_email: `${userId}@parko.app`,
      cus_phone: '01700000000',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
    });

    const response = await firstValueFrom(
      this.http.post(`${this.baseUrl}/gwprocess/v4/api.php`, payload.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    const data = response.data;
    if (data.status !== 'SUCCESS') {
      await this.prisma.paymentGatewayTxn.update({ where: { tranId }, data: { status: 'FAILED', failReason: data.failedreason } });
      throw new BadRequestException(data.failedreason ?? 'Payment initiation failed');
    }

    await this.prisma.paymentGatewayTxn.update({ where: { tranId }, data: { sessionKey: data.sessionkey } });

    return { tranId, paymentUrl: data.GatewayPageURL, amount, coinsToCredit: amount };
  }

  async processIpn(body: Record<string, string>) {
    const { tran_id, status, amount } = body;

    const txn = await this.prisma.paymentGatewayTxn.findUnique({ where: { tranId: tran_id } });
    if (!txn) return { success: false, reason: 'Transaction not found' };

    // Idempotency: already processed
    if (txn.status === 'SUCCESS') return { skipped: true };

    if (status !== 'VALID') {
      await this.prisma.paymentGatewayTxn.update({
        where: { tranId: tran_id },
        data: { status: 'FAILED', failReason: `SSLCommerz status: ${status}`, ipnPayload: body as any },
      });
      return { success: false };
    }

    // Validate hash
    if (!validateIpnHash(body, this.storePasswd)) {
      await this.prisma.paymentGatewayTxn.update({ where: { tranId: tran_id }, data: { status: 'FAILED', failReason: 'IPN hash validation failed', ipnPayload: body as any } });
      return { success: false, reason: 'Hash mismatch' };
    }

    // Amount sanity check
    const paidAmount = parseFloat(amount);
    if (Math.abs(paidAmount - txn.amount.toNumber()) > 1) {
      await this.prisma.paymentGatewayTxn.update({ where: { tranId: tran_id }, data: { status: 'FAILED', failReason: 'Amount mismatch', ipnPayload: body as any } });
      return { success: false, reason: 'Amount mismatch' };
    }

    // Credit wallet
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: txn.walletId }, select: { id: true, coinBalance: true } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      await tx.wallet.update({
        where: { id: txn.walletId },
        data: { coinBalance: { increment: txn.coinsToCredit }, totalEarned: { increment: txn.coinsToCredit } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: txn.walletId,
          type: 'TOP_UP',
          status: 'COMPLETED',
          amount: txn.coinsToCredit,
          balanceBefore: wallet.coinBalance,
          balanceAfter: wallet.coinBalance + txn.coinsToCredit,
          description: `Top-up via SSLCommerz — ${tran_id}`,
          processedAt: new Date(),
        },
      });
      await tx.paymentGatewayTxn.update({
        where: { tranId: tran_id },
        data: { status: 'SUCCESS', valId: body.val_id, bankTranId: body.bank_tran_id, cardType: body.card_type, ipnPayload: body as any, completedAt: new Date() },
      });
    });

    return { success: true };
  }

  async verifyPayment(userId: string, tranId: string) {
    const txn = await this.prisma.paymentGatewayTxn.findUnique({ where: { tranId } });
    if (!txn || txn.userId !== userId) throw new NotFoundException('Transaction not found');
    return { tranId, status: txn.status, amount: txn.amount, coinsToCredit: txn.coinsToCredit, completedAt: txn.completedAt };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.paymentGatewayTxn.findMany({ where, skip, take: limit, orderBy: { initiatedAt: 'desc' } }),
      this.prisma.paymentGatewayTxn.count({ where }),
    ]);
    return { data: data.map((t) => ({ ...t, amount: t.amount.toNumber() })), total, page, limit };
  }
}
