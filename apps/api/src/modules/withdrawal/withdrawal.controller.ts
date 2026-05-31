import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet/withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  @Roles(RoleType.OWNER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a withdrawal request (OWNER only)' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my withdrawal requests' })
  list(
    @CurrentUser() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.withdrawalService.listMine(user.id, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific withdrawal request' })
  getOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.withdrawalService.getById(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending withdrawal request' })
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.withdrawalService.cancel(user.id, id);
  }
}
