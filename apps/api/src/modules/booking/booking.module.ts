import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingExpiryProcessor } from './booking-expiry.processor';
import { WalletModule } from '@modules/wallet/wallet.module';
import { EscrowModule } from '@modules/escrow/escrow.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { VerificationModule } from '@modules/verification/verification.module';

@Module({
  imports: [WalletModule, EscrowModule, QueueModule, VerificationModule],
  controllers: [BookingController],
  providers: [BookingService, BookingExpiryProcessor],
  exports: [BookingService],
})
export class BookingModule {}
