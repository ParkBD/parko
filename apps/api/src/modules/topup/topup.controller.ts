import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TopupService } from './topup.service';
import { InitiateTopupDto } from './dto/initiate-topup.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('topup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet/topup')
export class TopupController {
  constructor(private readonly topupService: TopupService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate SSLCommerz payment to top up coins' })
  initiate(@CurrentUser() user: { id: string }, @Body() dto: InitiateTopupDto) {
    return this.topupService.initiatePayment(user.id, dto.amount);
  }

  @Post('ipn')
  @Public()
  @ApiOperation({ summary: 'SSLCommerz IPN webhook (no auth)' })
  ipn(@Body() body: Record<string, string>) {
    return this.topupService.processIpn(body);
  }

  @Get('verify/:tranId')
  @ApiOperation({ summary: 'Check top-up payment status by tranId' })
  verify(@CurrentUser() user: { id: string }, @Param('tranId') tranId: string) {
    return this.topupService.verifyPayment(user.id, tranId);
  }

  @Get('history')
  @ApiOperation({ summary: 'My top-up history' })
  history(
    @CurrentUser() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.topupService.getHistory(user.id, +page, +limit);
  }
}
