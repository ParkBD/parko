import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { WalletModule } from '@modules/wallet/wallet.module';
import { QUEUES } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    WalletModule,
    BullModule.registerQueue({ name: QUEUES.WITHDRAWAL }),
  ],
  providers: [WithdrawalService],
  controllers: [WithdrawalController],
})
export class WithdrawalModule {}
