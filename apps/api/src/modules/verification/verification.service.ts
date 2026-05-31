import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

// How long security magic links stay valid (ms)
const MAGIC_LINK_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface BookingPublicInfo {
  bookingRef: string;
  spaceName: string;
  spaceAddress: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  arrivalCode: string; // shown to security staff for manual verification
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly secret: string;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.get<string>('app.jwtSecret') ?? 'changeme';
    this.appUrl = this.config.get<string>('app.url') ?? 'http://localhost:3000';
  }

  // ─── Magic Link Generation ─────────────────────────────────────────────────

  /**
   * Creates a one-time HMAC-signed token for security staff to confirm
   * a driver's arrival without needing a ParkNest account.
   *
   * Token structure: base64url(bookingId:expiresAt:hmac)
   * HMAC payload:   bookingId + ':' + expiresAt
   */
  async createMagicToken(bookingId: string, driverId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    const expiresAtMs = expiresAt.getTime().toString();

    const hmac = createHmac('sha256', this.secret)
      .update(`${bookingId}:${expiresAtMs}`)
      .digest('hex');

    const raw = `${bookingId}:${expiresAtMs}:${hmac}`;
    const token = Buffer.from(raw).toString('base64url');

    // Store in VerificationCode so we can track usage
    await this.prisma.verificationCode.create({
      data: {
        userId: driverId,
        bookingId,
        type: 'SECURITY_VERIFY',
        code: randomUUID(), // not used for code flow, just a required non-null field
        token,
        expiresAt,
        maxAttempts: 1, // magic links are strictly single-use
      },
    });

    return { token, url: `${this.appUrl}/public/verify/${token}`, expiresAt };
  }

  // ─── Magic Link Validation ─────────────────────────────────────────────────

  private decodeToken(token: string): { bookingId: string; expiresAtMs: string; hmac: string } | null {
    try {
      const raw = Buffer.from(token, 'base64url').toString('utf8');
      const parts = raw.split(':');
      if (parts.length !== 3) return null;
      const [bookingId, expiresAtMs, hmac] = parts;
      return { bookingId, expiresAtMs, hmac };
    } catch {
      return null;
    }
  }

  private verifyHmac(bookingId: string, expiresAtMs: string, providedHmac: string): boolean {
    const expected = createHmac('sha256', this.secret)
      .update(`${bookingId}:${expiresAtMs}`)
      .digest('hex');

    // Constant-time comparison — prevents timing oracle attacks
    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedHmac, 'hex'));
    } catch {
      return false; // buffer length mismatch → invalid
    }
  }

  async getBookingByMagicToken(token: string): Promise<BookingPublicInfo> {
    const decoded = this.decodeToken(token);
    if (!decoded) throw new BadRequestException('Invalid verification link');

    const { bookingId, expiresAtMs, hmac } = decoded;

    if (!this.verifyHmac(bookingId, expiresAtMs, hmac)) {
      throw new BadRequestException('Verification link is invalid or has been tampered with');
    }
    if (Date.now() > parseInt(expiresAtMs)) {
      throw new BadRequestException('Verification link has expired');
    }

    const vc = await this.prisma.verificationCode.findFirst({
      where: { token, type: 'SECURITY_VERIFY', bookingId },
    });
    if (!vc) throw new NotFoundException('Verification record not found');

    return this.loadPublicBookingInfo(bookingId);
  }

  /**
   * Security staff clicks magic link → driver arrival confirmed.
   * Transitions booking: RESERVED → ARRIVED.
   */
  async confirmArrivalByMagicToken(token: string): Promise<{ success: boolean; arrivedAt: Date }> {
    const decoded = this.decodeToken(token);
    if (!decoded) throw new BadRequestException('Invalid verification link');

    const { bookingId, expiresAtMs, hmac } = decoded;

    if (!this.verifyHmac(bookingId, expiresAtMs, hmac)) {
      throw new BadRequestException('Verification link is invalid');
    }
    if (Date.now() > parseInt(expiresAtMs)) {
      throw new BadRequestException('Verification link has expired');
    }

    const vc = await this.prisma.verificationCode.findFirst({
      where: { token, type: 'SECURITY_VERIFY', bookingId },
    });
    if (!vc) throw new NotFoundException('Verification record not found');
    if (vc.isUsed) throw new BadRequestException('This verification link has already been used');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.RESERVED) {
      throw new BadRequestException(`Booking is ${booking.status} — arrival confirmation not applicable`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.ARRIVED,
          arrivedAt: now,
          // arrivedBy is null — security confirmed via magic link (no account)
        },
      });
      await tx.verificationCode.update({
        where: { id: vc.id },
        data: { isUsed: true, usedAt: now, attempts: { increment: 1 } },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.RESERVED,
          toStatus: BookingStatus.ARRIVED,
          reason: 'security_magic_link',
          metadata: { method: 'magic_link' },
        },
      });
    });

    this.logger.log(`Booking ${bookingId} ARRIVED via magic link`);
    return { success: true, arrivedAt: now };
  }

  // ─── Manual Code Verification ──────────────────────────────────────────────

  /**
   * Security staff manually enters the 6-digit code shown by the driver.
   * No auth required — rate-limited at the controller level.
   */
  async confirmArrivalByCode(bookingRef: string, code: string): Promise<{ success: boolean; arrivedAt: Date }> {
    const booking = await this.prisma.booking.findFirst({
      where: { bookingRef, deletedAt: null },
      include: { verificationCodes: { where: { type: 'CHECK_IN', isUsed: false } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.RESERVED) {
      throw new BadRequestException(`Booking is ${booking.status} — not awaiting arrival`);
    }

    const vc = booking.verificationCodes.find((v) => v.expiresAt > new Date());
    if (!vc) throw new BadRequestException('Arrival code has expired — contact support');
    if (vc.attempts >= vc.maxAttempts) {
      throw new BadRequestException('Maximum code attempts exceeded — use magic link from email');
    }

    // Constant-time comparison prevents timing attacks on the 6-digit code
    const codeBuffer = Buffer.from(code.padEnd(6));
    const expectedBuffer = Buffer.from(vc.code.padEnd(6));
    const match = timingSafeEqual(codeBuffer, expectedBuffer);

    if (!match) {
      await this.prisma.verificationCode.update({
        where: { id: vc.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = vc.maxAttempts - vc.attempts - 1;
      throw new BadRequestException(`Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.ARRIVED, arrivedAt: now },
      });
      await tx.verificationCode.update({
        where: { id: vc.id },
        data: { isUsed: true, usedAt: now },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.RESERVED,
          toStatus: BookingStatus.ARRIVED,
          reason: 'security_code',
          metadata: { method: 'manual_code' },
        },
      });
    });

    this.logger.log(`Booking ${booking.id} ARRIVED via manual code`);
    return { success: true, arrivedAt: now };
  }

  // ─── Public Booking Lookup (for security portal) ───────────────────────────

  async getBookingByRef(bookingRef: string): Promise<BookingPublicInfo> {
    const booking = await this.prisma.booking.findFirst({
      where: { bookingRef, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.loadPublicBookingInfo(booking.id);
  }

  private async loadPublicBookingInfo(bookingId: string): Promise<BookingPublicInfo> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        space: { select: { name: true, addressLine1: true, city: true } },
        driver: { select: { profile: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return {
      bookingRef: booking.bookingRef,
      spaceName: booking.space.name,
      spaceAddress: `${booking.space.addressLine1}, ${booking.space.city}`,
      driverName: booking.driver.profile
        ? `${booking.driver.profile.firstName} ${booking.driver.profile.lastName}`
        : 'Unknown',
      vehicleNumber: booking.vehicleNumber,
      vehicleType: booking.vehicleType,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      arrivalCode: booking.arrivalCode ?? '',
    };
  }
}
