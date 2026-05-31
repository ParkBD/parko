import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { CommissionService } from '../commission/commission.service';

@Module({
  providers: [EscrowService, CommissionService],
  exports: [EscrowService],
})
export class EscrowModule {}
