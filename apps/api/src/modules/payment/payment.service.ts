import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  // Gateway callbacks are handled here after redirect
  // All internal payments (WALLET/COINS) are handled by WalletService
  async handleGatewayCallback(data: Record<string, any>) {
    this.logger.log('Gateway callback received', data);
    // TODO: verify gateway signature and update booking payment status
    return { received: true };
  }
}
