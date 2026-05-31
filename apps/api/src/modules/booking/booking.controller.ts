import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingStatus, RoleType } from '@prisma/client';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ── Driver ──────────────────────────────────────────────────────────────────

  @Roles(RoleType.DRIVER)
  @Post()
  @ApiOperation({ summary: 'Create booking (→ PENDING)' })
  createBooking(@CurrentUser('id') driverId: string, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(driverId, dto);
  }

  @Roles(RoleType.DRIVER)
  @Post(':id/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm payment (PENDING → RESERVED)' })
  confirmPayment(
    @Param('id') id: string,
    @CurrentUser('id') driverId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.bookingService.confirmPayment(id, driverId, dto);
  }

  @Roles(RoleType.DRIVER)
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel booking (PENDING|RESERVED|ARRIVED → CANCELLED)' })
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.bookingService.cancelBooking(id, userId, body.reason);
  }

  @Roles(RoleType.DRIVER)
  @Get()
  @ApiOperation({ summary: 'My bookings' })
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
  @ApiOperation({ summary: 'Bookings for my spaces' })
  getOwnerBookings(
    @CurrentUser('id') ownerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.getOwnerBookings(ownerId, +page, +limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail' })
  getBooking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.getBooking(id, user);
  }

  // ── Security / Admin ────────────────────────────────────────────────────────

  @Roles(RoleType.SECURITY, RoleType.ADMIN)
  @Post(':id/arrive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify driver arrival code (RESERVED → ARRIVED)' })
  markArrived(
    @Param('id') bookingId: string,
    @CurrentUser('id') securityId: string,
    @Body() body: { code: string },
  ) {
    return this.bookingService.markArrived(bookingId, body.code, securityId);
  }

  @Roles(RoleType.SECURITY, RoleType.ADMIN)
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start parking session (ARRIVED → ACTIVE)' })
  startSession(@Param('id') bookingId: string, @CurrentUser('id') securityId: string) {
    return this.bookingService.startSession(bookingId, securityId);
  }

  @Roles(RoleType.SECURITY, RoleType.ADMIN)
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End session and settle payment (ACTIVE → COMPLETED)' })
  completeSession(@Param('id') bookingId: string, @CurrentUser('id') securityId: string) {
    return this.bookingService.completeSession(bookingId, securityId);
  }
}
