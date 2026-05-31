import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType, UserStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats' })
  stats() { return this.adminService.getDashboardStats(); }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: UserStatus) {
    return this.adminService.getUsers(+page, +limit, status);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  updateUserStatus(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { status: UserStatus; reason?: string },
  ) {
    return this.adminService.updateUserStatus(userId, body.status, adminId, body.reason);
  }

  @Get('spaces/pending')
  @ApiOperation({ summary: 'Get pending space approvals' })
  getPendingSpaces(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getPendingSpaces(+page, +limit);
  }

  @Patch('spaces/:id/approve')
  @ApiOperation({ summary: 'Approve parking space' })
  approveSpace(@Param('id') spaceId: string, @CurrentUser('id') adminId: string) {
    return this.adminService.approveSpace(spaceId, adminId);
  }

  @Patch('spaces/:id/reject')
  @ApiOperation({ summary: 'Reject parking space' })
  rejectSpace(
    @Param('id') spaceId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectSpace(spaceId, adminId, body.reason);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get admin action log' })
  getActions(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.getAdminActions(+page, +limit);
  }
}
