import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationService.getUserNotifications(userId, +page, +limit);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationService.markRead(id, userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllRead(userId);
  }
}
