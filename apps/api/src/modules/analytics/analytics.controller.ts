import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Admin dashboard stats' })
  adminStats() {
    return this.analyticsService.getAdminStats();
  }

  @Roles(RoleType.OWNER)
  @Get('owner')
  @ApiOperation({ summary: 'Owner revenue and booking stats' })
  ownerStats(@CurrentUser('id') ownerId: string) {
    return this.analyticsService.getOwnerStats(ownerId);
  }

  @Roles(RoleType.OWNER)
  @Get('spaces/:id')
  @ApiOperation({ summary: 'Stats for a specific parking space' })
  spaceStats(@Param('id') id: string, @CurrentUser('id') ownerId: string) {
    return this.analyticsService.getSpaceStats(id, ownerId);
  }
}
