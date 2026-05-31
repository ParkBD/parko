import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import { AdminWalletService } from './admin-wallet.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminFraudService } from './admin-fraud.service';
import { AdminDisputeService } from './admin-dispute.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminWithdrawalService } from './admin-withdrawal.service';
import { AdminController } from './admin.controller';
import { WalletModule } from '@modules/wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminUserService,
    AdminWalletService,
    AdminAnalyticsService,
    AdminFraudService,
    AdminDisputeService,
    AdminAuditService,
    AdminWithdrawalService,
  ],
})
export class AdminModule {}
