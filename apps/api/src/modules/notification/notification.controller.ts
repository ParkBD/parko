import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private notifService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notifService.getUserNotifications(userId, +page, +limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notifService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notifService.markRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifService.markAllRead(userId);
  }
}
