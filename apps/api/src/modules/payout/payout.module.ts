import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { WalletModule } from '@modules/wallet/wallet.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
  imports: [WalletModule, QueueModule],
  controllers: [PayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
