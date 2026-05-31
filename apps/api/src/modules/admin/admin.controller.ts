import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [users, lots, bookings, pendingLots, pendingWithdrawals] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.parkingLot.count(),
      this.prisma.booking.count(),
      this.prisma.parkingLot.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    ]);
    return { users, lots, bookings, pendingLots, pendingWithdrawals };
  }

  @Get('lots/pending')
  getPendingLots(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.prisma.parkingLot.findMany({
      where: { status: 'PENDING_APPROVAL' },
      skip: (+page - 1) * +limit,
      take: +limit,
      include: { owner: { select: { email: true, firstName: true, lastName: true } } },
    });
  }

  @Get('users')
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('role') role?: string) {
    const where: any = role ? { role } : {};
    return this.prisma.user.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, status: true, firstName: true, lastName: true, createdAt: true },
    });
  }

  @Patch('users/:id/status')
  async updateUserStatus(@Param('id') id: string, @Query('status') status: string) {
    return this.prisma.user.update({ where: { id }, data: { status: status as any } });
  }
}
