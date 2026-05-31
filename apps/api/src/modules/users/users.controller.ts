import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() body: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Roles('ADMIN')
  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(+page, +limit, role);
  }

  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED',
  ) {
    return this.usersService.updateStatus(id, status);
  }
}
