import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DisputeStatus, DisputeType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { WalletService } from '@modules/wallet/wallet.service';

@Injectable()
export class AdminDisputeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  // ─── List Disputes ─────────────────────────────────────────────────────────

  async listDisputes(page = 1, limit = 20, status?: DisputeStatus) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingRef: true, status: true, totalAmount: true,
              space: { select: { name: true, city: true } },
            },
          },
          raiser: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          assignee: { select: { email: true } },
          _count: { select: { notes: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Get Dispute Detail ────────────────────────────────────────────────────

  async getDispute(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            driver: { select: { email: true, profile: true } },
            space: { select: { name: true, city: true, addressLine1: true, ownerId: true } },
            statusHistory: { orderBy: { createdAt: 'asc' } },
          },
        },
        raiser: { select: { email: true, profile: true } },
        assignee: { select: { email: true } },
        notes: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { email: true } } },
        },
      },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  // ─── Open Dispute (by admin on behalf of driver or system) ────────────────

  async openDispute(adminId: string, body: {
    bookingId: string;
    raisedBy: string;
    type: DisputeType;
    description: string;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: body.bookingId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const existing = await this.prisma.dispute.findFirst({
      where: { bookingId: body.bookingId, status: { in: ['OPEN', 'INVESTIGATING'] } },
    });
    if (existing) throw new BadRequestException('An open dispute already exists for this booking');

    const dispute = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: {
          bookingId: body.bookingId,
          raisedBy: body.raisedBy,
          assignedTo: adminId,
          type: body.type,
          description: body.description,
          status: 'INVESTIGATING',
        },
      });
      await tx.adminAction.create({
        data: {
          adminId, type: 'RESOLVE_DISPUTE',
          entityType: 'dispute', entityId: d.id,
          reason: `Dispute opened: ${body.type}`,
        },
      });
      return d;
    });

    return dispute;
  }

  // ─── Add Note to Dispute ───────────────────────────────────────────────────

  async addNote(disputeId: string, adminId: string, body: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED') {
      throw new BadRequestException('Cannot add notes to a closed dispute');
    }

    return this.prisma.disputeNote.create({
      data: { disputeId, authorId: adminId, body },
    });
  }

  // ─── Assign Dispute ────────────────────────────────────────────────────────

  async assignDispute(disputeId: string, assignedTo: string, adminId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: { assignedTo, status: 'INVESTIGATING' },
      });
      await tx.adminAction.create({
        data: { adminId, type: 'RESOLVE_DISPUTE', entityType: 'dispute', entityId: disputeId, reason: 'Dispute assigned' },
      });
    });

    return { success: true };
  }

  // ─── Resolve Dispute ───────────────────────────────────────────────────────

  async resolveDispute(disputeId: string, adminId: string, body: {
    resolution: string;
    refundAmount?: number;      // issue partial/full refund to driver
    refundToOwnerId?: string;   // if owner needs compensation
  }) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { booking: { select: { driverId: true, totalAmount: true, bookingRef: true } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED') {
      throw new BadRequestException('Dispute is already closed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          resolution: body.resolution,
          refundAmount: body.refundAmount ?? null,
          refundIssued: !!body.refundAmount,
          resolvedAt: new Date(),
        },
      });
      await tx.adminAction.create({
        data: {
          adminId, type: 'RESOLVE_DISPUTE',
          entityType: 'dispute', entityId: disputeId,
          reason: body.resolution,
          metadata: { refundAmount: body.refundAmount },
        },
      });
    });

    // Issue refund outside transaction (wallet service manages its own tx)
    if (body.refundAmount && body.refundAmount > 0) {
      await this.walletService.creditWallet(
        dispute.booking.driverId,
        body.refundAmount,
        'REFUND',
        {
          description: `Dispute resolution refund — ${dispute.booking.bookingRef}`,
          referenceType: 'dispute',
          referenceId: disputeId,
        },
      );
    }

    return { success: true, disputeId, status: 'RESOLVED' };
  }

  // ─── Dismiss Dispute ───────────────────────────────────────────────────────

  async dismissDispute(disputeId: string, adminId: string, reason: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED') {
      throw new BadRequestException('Dispute is already closed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: { status: 'DISMISSED', resolution: reason, resolvedAt: new Date() },
      });
      await tx.adminAction.create({
        data: { adminId, type: 'CLOSE_DISPUTE', entityType: 'dispute', entityId: disputeId, reason },
      });
    });

    return { success: true, disputeId, status: 'DISMISSED' };
  }
}
