import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { SSLCommerzService } from './sslcommerz.service';
import { WalletModule } from '@modules/wallet/wallet.module';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    WalletModule,
    BullModule.registerQueue({ name: QUEUES.NOTIFICATION }),
  ],
  providers: [PaymentService, SSLCommerzService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
