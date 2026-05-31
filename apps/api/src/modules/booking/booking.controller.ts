import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingStatus, RoleType } from '@prisma/client';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Roles(RoleType.DRIVER)
  @Post()
  @ApiOperation({ summary: 'Create booking' })
  createBooking(@CurrentUser('id') driverId: string, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(driverId, dto);
  }

  @Roles(RoleType.DRIVER)
  @Get()
  @ApiOperation({ summary: 'Get my bookings' })
  getBookings(
    @CurrentUser('id') driverId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.getBookings(driverId, +page, +limit, status);
  }

  @Roles(RoleType.OWNER)
  @Get('owner')
  @ApiOperation({ summary: 'Get bookings for my spaces' })
  getOwnerBookings(
    @CurrentUser('id') ownerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.getOwnerBookings(ownerId, +page, +limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  getBooking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.getBooking(id, user);
  }

  @Roles(RoleType.DRIVER)
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel booking' })
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.bookingService.cancelBooking(id, userId, body.reason);
  }

  @Roles(RoleType.SECURITY, RoleType.ADMIN)
  @Post(':id/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in driver' })
  checkIn(
    @Param('id') bookingId: string,
    @CurrentUser('id') securityId: string,
    @Body() body: { code: string },
  ) {
    return this.bookingService.checkIn(bookingId, body.code, securityId);
  }

  @Roles(RoleType.SECURITY, RoleType.ADMIN)
  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out driver' })
  checkOut(@Param('id') bookingId: string, @CurrentUser('id') securityId: string) {
    return this.bookingService.checkOut(bookingId, securityId);
  }
}
