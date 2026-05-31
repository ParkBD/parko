import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TopupService } from './topup.service';
import { TopupController } from './topup.controller';

@Module({
  imports: [HttpModule],
  controllers: [TopupController],
  providers: [TopupService],
  exports: [TopupService],
})
export class TopupModule {}
