import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getTransactions(userId, +page, +limit);
  }
}
