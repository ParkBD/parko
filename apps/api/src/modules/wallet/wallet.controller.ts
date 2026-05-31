import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletTransactionType } from '@prisma/client';
import { WalletService } from './wallet.service';
import { BuyCoinsDto } from './dto/buy-coins.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get my wallet' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: WalletTransactionType,
  ) {
    return this.walletService.getTransactions(userId, +page, +limit, type);
  }

  @Get('coins/purchases')
  @ApiOperation({ summary: 'Get coin purchase history' })
  getCoinPurchases(@CurrentUser('id') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.walletService.getCoinPurchases(userId, +page, +limit);
  }

  @Post('coins/buy')
  @ApiOperation({ summary: 'Buy coin package' })
  buyCoins(@CurrentUser('id') userId: string, @Body() dto: BuyCoinsDto) {
    return this.walletService.buyCoinPackage(userId, dto);
  }
}
