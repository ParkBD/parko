import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]:   [BookingStatus.RESERVED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  [BookingStatus.RESERVED]:  [BookingStatus.ARRIVED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  [BookingStatus.ARRIVED]:   [BookingStatus.ACTIVE, BookingStatus.CANCELLED],
  [BookingStatus.ACTIVE]:    [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.EXPIRED]:   [],
};

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid transition: ${from} → ${to}. Allowed from ${from}: [${allowed?.join(', ') || 'none'}]`,
    );
  }
}

export const CANCELLABLE_STATES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.RESERVED,
  BookingStatus.ARRIVED,
];

export const ACTIVE_BOOKING_STATES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.RESERVED,
  BookingStatus.ARRIVED,
  BookingStatus.ACTIVE,
];

// Slot must be decremented for overlap check when booking is in these states
export const SLOT_OCCUPYING_STATES: BookingStatus[] = [
  BookingStatus.RESERVED,
  BookingStatus.ARRIVED,
  BookingStatus.ACTIVE,
];
