import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Roles('DRIVER')
  @Post()
  createBooking(@CurrentUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(userId, dto);
  }

  @Roles('DRIVER')
  @Get('mine')
  getMyBookings(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.bookingService.getDriverBookings(userId, +page, +limit);
  }

  @Roles('DRIVER')
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.cancelBooking(id, userId, reason);
  }

  @Roles('SECURITY', 'ADMIN')
  @Post('checkin')
  checkIn(@Body('code') code: string, @CurrentUser('id') securityId: string) {
    return this.bookingService.checkIn(code, securityId);
  }

  @Roles('SECURITY', 'ADMIN')
  @Post('checkout')
  checkOut(@Body('code') code: string, @CurrentUser('id') securityId: string) {
    return this.bookingService.checkOut(code, securityId);
  }

  @Roles('OWNER')
  @Get('lot/:lotId')
  getLotBookings(
    @Param('lotId') lotId: string,
    @CurrentUser('id') ownerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.bookingService.getLotBookings(lotId, ownerId, +page, +limit);
  }
}
