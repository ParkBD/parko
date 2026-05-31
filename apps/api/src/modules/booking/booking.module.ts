import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { WalletModule } from '@modules/wallet/wallet.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
  imports: [WalletModule, QueueModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
