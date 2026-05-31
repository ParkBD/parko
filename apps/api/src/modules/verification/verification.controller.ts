import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@common/decorators/public.decorator';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationService } from './verification.service';

class CodeVerifyDto {
  @ApiProperty({ example: 'clx1abc123', description: 'Booking reference number' })
  @IsString() @IsNotEmpty()
  bookingRef: string;

  @ApiProperty({ example: '847291', description: '6-digit arrival code shown by driver' })
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}

/**
 * All endpoints here are PUBLIC — no JWT required.
 * Security staff use these without a ParkNest account.
 *
 * Rate limit: 10 requests / 60s per IP (stricter than global 100/60s).
 * This prevents brute-force against the 6-digit code (10^6 space).
 */
@ApiTags('public/verify')
@Public()
@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('public/verify')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Look up booking details by ref. Security staff use this to pull up
   * vehicle info without needing an account.
   */
  @Get('booking/:bookingRef')
  @ApiOperation({ summary: '[Public] Get booking info by ref (for security staff)' })
  getBookingByRef(@Param('bookingRef') bookingRef: string) {
    return this.verificationService.getBookingByRef(bookingRef);
  }

  /**
   * Magic-link endpoint: security staff clicks the link from their email.
   * Returns booking info — no confirmation yet.
   */
  @Get('magic/:token')
  @ApiOperation({ summary: '[Public] Get booking info via magic link' })
  getMagicLinkInfo(@Param('token') token: string) {
    return this.verificationService.getBookingByMagicToken(token);
  }

  /**
   * Magic-link confirmation: security staff clicks "Confirm Arrival" button.
   * Transitions booking RESERVED → ARRIVED. Single-use, HMAC-protected.
   */
  @Post('magic/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Confirm driver arrival via magic link (RESERVED → ARRIVED)' })
  confirmArrivalByMagicLink(@Param('token') token: string) {
    return this.verificationService.confirmArrivalByMagicToken(token);
  }

  /**
   * Manual code verification: security staff enters the 6-digit code
   * shown by the driver. Fallback when email/magic-link is unavailable.
   */
  @Post('code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Confirm driver arrival via 6-digit code' })
  confirmArrivalByCode(@Body() dto: CodeVerifyDto) {
    return this.verificationService.confirmArrivalByCode(dto.bookingRef, dto.code);
  }
}
