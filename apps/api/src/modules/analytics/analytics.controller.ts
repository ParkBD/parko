import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Roles('OWNER')
  @Get('owner/dashboard')
  ownerDashboard(@CurrentUser('id') userId: string) {
    return this.analyticsService.getOwnerDashboard(userId);
  }

  @Roles('OWNER')
  @Get('owner/earnings')
  ownerEarnings(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getOwnerEarnings(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Roles('ADMIN')
  @Get('admin/dashboard')
  adminDashboard() {
    return this.analyticsService.getAdminDashboard();
  }
}
