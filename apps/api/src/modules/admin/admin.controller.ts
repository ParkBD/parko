import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditAction, DisputeStatus, DisputeType, RoleType, UserStatus, WithdrawalStatus } from '@prisma/client';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import { AdminWalletService } from './admin-wallet.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminFraudService } from './admin-fraud.service';
import { AdminDisputeService } from './admin-dispute.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminWithdrawalService } from './admin-withdrawal.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminUserService: AdminUserService,
    private readonly adminWalletService: AdminWalletService,
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly adminFraudService: AdminFraudService,
    private readonly adminDisputeService: AdminDisputeService,
    private readonly adminAuditService: AdminAuditService,
    private readonly adminWithdrawalService: AdminWithdrawalService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  @Get('overview')
  @ApiOperation({ summary: 'Platform overview — KPIs, revenue, booking counts' })
  overview() { return this.adminAnalyticsService.getOverview(); }

  // ══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  @Get('users')
  @ApiOperation({ summary: 'Search & list users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'role', required: false, enum: RoleType })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'createdFrom', required: false })
  @ApiQuery({ name: 'createdTo', required: false })
  listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: UserStatus,
    @Query('role') role?: RoleType,
    @Query('search') search?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.adminUserService.listUsers({ page: +page, limit: +limit, status, role, search, createdFrom, createdTo });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'User detail — bookings, wallet, login history' })
  getUser(@Param('id') id: string) { return this.adminUserService.getUserDetail(id); }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status (ACTIVE | SUSPENDED | BANNED)' })
  updateUserStatus(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { status: UserStatus; reason: string },
  ) {
    return this.adminUserService.updateUserStatus(userId, body.status, adminId, body.reason);
  }

  @Post('users/:id/roles')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { role: RoleType },
  ) {
    return this.adminUserService.assignRole(userId, body.role, adminId);
  }

  @Delete('users/:id/roles/:role')
  @ApiOperation({ summary: 'Revoke role from user' })
  revokeRole(
    @Param('id') userId: string,
    @Param('role') role: RoleType,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUserService.revokeRole(userId, role, adminId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARKING MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  @Get('spaces/pending')
  @ApiOperation({ summary: 'Spaces awaiting approval' })
  getPendingSpaces(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getPendingSpaces(+page, +limit);
  }

  @Patch('spaces/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve parking space' })
  approveSpace(@Param('id') spaceId: string, @CurrentUser('id') adminId: string) {
    return this.adminService.approveSpace(spaceId, adminId);
  }

  @Patch('spaces/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject parking space' })
  rejectSpace(
    @Param('id') spaceId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectSpace(spaceId, adminId, body.reason);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WALLET MONITORING
  // ══════════════════════════════════════════════════════════════════════════

  @Get('wallets')
  @ApiOperation({ summary: 'List all wallets (sortable by balance)' })
  listWallets(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('frozen') frozen?: string,
    @Query('minBalance') minBalance?: number,
  ) {
    return this.adminWalletService.listWallets(
      +page, +limit,
      frozen !== undefined ? frozen === 'true' : undefined,
      minBalance ? +minBalance : undefined,
    );
  }

  @Get('wallets/:id')
  @ApiOperation({ summary: 'Wallet detail + last 50 transactions' })
  getWallet(@Param('id') id: string) { return this.adminWalletService.getWalletDetail(id); }

  @Patch('wallets/:id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze wallet — blocks all debits/credits' })
  freezeWallet(
    @Param('id') walletId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminWalletService.freezeWallet(walletId, adminId, body.reason);
  }

  @Patch('wallets/:id/unfreeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfreeze wallet' })
  unfreezeWallet(
    @Param('id') walletId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminWalletService.unfreezeWallet(walletId, adminId, body.reason);
  }

  @Patch('wallets/:id/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manual balance adjustment (positive=credit, negative=debit)' })
  adjustWallet(
    @Param('id') walletId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.adminWalletService.adjustBalance(walletId, adminId, body.amount, body.reason);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COIN MONITORING
  // ══════════════════════════════════════════════════════════════════════════

  @Get('coins/metrics')
  @ApiOperation({ summary: 'Coin economy — circulating supply, top holders, 30d volume' })
  coinMetrics() { return this.adminWalletService.getCoinMetrics(); }

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Revenue time-series (daily / weekly / monthly)' })
  @ApiQuery({ name: 'granularity', enum: ['daily', 'weekly', 'monthly'], required: false })
  @ApiQuery({ name: 'days', required: false })
  revenueSeries(
    @Query('granularity') granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days = 30,
  ) {
    return this.adminAnalyticsService.getRevenueSeries(granularity, +days);
  }

  @Get('analytics/bookings')
  @ApiOperation({ summary: 'Booking breakdown by status, payment method, vehicle type' })
  bookingAnalytics(@Query('days') days = 30) {
    return this.adminAnalyticsService.getBookingAnalytics(+days);
  }

  @Get('analytics/revenue/cities')
  @ApiOperation({ summary: 'Revenue breakdown by city with platform commission' })
  revenueByCity() { return this.adminAnalyticsService.getRevenueByCity(); }

  @Get('analytics/occupancy')
  @ApiOperation({ summary: 'Real-time slot occupancy per space' })
  occupancy() { return this.adminAnalyticsService.getOccupancyMetrics(); }

  // ══════════════════════════════════════════════════════════════════════════
  // FRAUD DETECTION  (Super Admin only)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('fraud/signals')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: '[Super Admin] Fraud signal report — risk-scored user list' })
  fraudSignals() { return this.adminFraudService.getFraudReport(); }

  // ══════════════════════════════════════════════════════════════════════════
  // DISPUTE RESOLUTION
  // ══════════════════════════════════════════════════════════════════════════

  @Get('disputes')
  @ApiOperation({ summary: 'List disputes with optional status filter' })
  listDisputes(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: DisputeStatus,
  ) {
    return this.adminDisputeService.listDisputes(+page, +limit, status);
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Dispute detail with full booking context and notes' })
  getDispute(@Param('id') id: string) { return this.adminDisputeService.getDispute(id); }

  @Post('disputes')
  @ApiOperation({ summary: 'Open a dispute on a booking' })
  openDispute(
    @CurrentUser('id') adminId: string,
    @Body() body: { bookingId: string; raisedBy: string; type: DisputeType; description: string },
  ) {
    return this.adminDisputeService.openDispute(adminId, body);
  }

  @Post('disputes/:id/notes')
  @ApiOperation({ summary: 'Add investigation note to dispute' })
  addDisputeNote(
    @Param('id') disputeId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { body: string },
  ) {
    return this.adminDisputeService.addNote(disputeId, adminId, body.body);
  }

  @Patch('disputes/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign dispute to admin investigator' })
  assignDispute(
    @Param('id') disputeId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { assignedTo: string },
  ) {
    return this.adminDisputeService.assignDispute(disputeId, body.assignedTo, adminId);
  }

  @Patch('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve dispute — optionally issue partial/full refund' })
  resolveDispute(
    @Param('id') disputeId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { resolution: string; refundAmount?: number },
  ) {
    return this.adminDisputeService.resolveDispute(disputeId, adminId, body);
  }

  @Patch('disputes/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss dispute without resolution' })
  dismissDispute(
    @Param('id') disputeId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminDisputeService.dismissDispute(disputeId, adminId, body.reason);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS  (Super Admin for raw logs, Admin for action log)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('audit/logs')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: '[Super Admin] Immutable audit log with full filter' })
  getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('actorId') actorId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminAuditService.getAuditLogs({ page: +page, limit: +limit, actorId, subjectId, action, entityType, from, to });
  }

  @Get('audit/actions')
  @ApiOperation({ summary: 'Admin action log — who did what and when' })
  getAdminActions(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('adminId') adminId?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminAuditService.getAdminActions({ page: +page, limit: +limit, adminId, entityType, from, to });
  }

  @Get('audit/summary')
  @ApiOperation({ summary: 'Audit activity summary for last 7 days' })
  auditSummary() { return this.adminAuditService.getAuditSummary(); }

  @Get('audit/entity/:type/:id')
  @ApiOperation({ summary: 'Full activity timeline for a specific entity' })
  entityTimeline(@Param('type') type: string, @Param('id') id: string) {
    return this.adminAuditService.getEntityTimeline(type, id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WITHDRAWALS (existing)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('withdrawals')
  @ApiOperation({ summary: 'List withdrawal requests' })
  listWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminWithdrawalService.list(status, +page, +limit);
  }

  @Get('withdrawals/:id')
  getWithdrawal(@Param('id') id: string) { return this.adminWithdrawalService.getOne(id); }

  @Patch('withdrawals/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveWithdrawal(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminWithdrawalService.approve(adminId, id);
  }

  @Patch('withdrawals/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectWithdrawal(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminWithdrawalService.reject(adminId, id, body.reason);
  }

  @Patch('withdrawals/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeWithdrawal(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminWithdrawalService.complete(adminId, id);
  }
}
