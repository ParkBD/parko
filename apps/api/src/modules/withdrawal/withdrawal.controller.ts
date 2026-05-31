import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private withdrawalService: WithdrawalService) {}

  @Roles('OWNER')
  @Post()
  request(
    @CurrentUser('id') userId: string,
    @Body('amount') amount: number,
    @Body('method') method: string,
    @Body('accountDetails') accountDetails: any,
  ) {
    return this.withdrawalService.requestWithdrawal(userId, amount, method, accountDetails);
  }

  @Roles('OWNER')
  @Get('mine')
  getMine(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.withdrawalService.getUserWithdrawals(userId, +page, +limit);
  }

  @Roles('ADMIN')
  @Get()
  getAll(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.withdrawalService.getAdminWithdrawals(status, +page, +limit);
  }

  @Roles('ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.withdrawalService.approveWithdrawal(id, adminId);
  }

  @Roles('ADMIN')
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
  ) {
    return this.withdrawalService.rejectWithdrawal(id, adminId, reason);
  }
}
