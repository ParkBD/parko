import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType, PayoutStatus } from '@prisma/client';
import { PayoutService } from './payout.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('payouts')
@ApiBearerAuth()
@Controller('payouts')
export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  @Roles(RoleType.OWNER)
  @Post()
  @ApiOperation({ summary: 'Request payout' })
  requestPayout(@CurrentUser('id') userId: string, @Body() dto: RequestPayoutDto) {
    return this.payoutService.requestPayout(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my payouts' })
  getMyPayouts(@CurrentUser('id') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.payoutService.getMyPayouts(userId, +page, +limit);
  }

  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Admin: list all payouts' })
  getAllPayouts(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: PayoutStatus) {
    return this.payoutService.getAllPayouts(+page, +limit, status);
  }

  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @Patch(':id/process')
  @ApiOperation({ summary: 'Admin: approve or reject payout' })
  processPayout(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ) {
    return this.payoutService.processPayout(id, adminId, body.action, body.reason);
  }
}
