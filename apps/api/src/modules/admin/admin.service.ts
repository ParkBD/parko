import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleType, UserStatus, ParkingSpaceStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [users, spaces, bookings, pendingSpaces, pendingPayouts] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.parkingSpace.count({ where: { deletedAt: null, status: ParkingSpaceStatus.ACTIVE } }),
      this.prisma.booking.count({ where: { deletedAt: null } }),
      this.prisma.parkingSpace.count({ where: { status: ParkingSpaceStatus.PENDING_APPROVAL } }),
      this.prisma.ownerPayout.count({ where: { status: 'PENDING' } }),
    ]);
    return { users, activeSpaces: spaces, totalBookings: bookings, pendingApprovals: pendingSpaces, pendingPayouts };
  }

  async getUsers(page = 1, limit = 20, status?: UserStatus) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { profile: true, roles: { include: { role: true } } } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async updateUserStatus(userId: string, status: UserStatus, adminId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status } });
      await tx.adminAction.create({ data: { adminId, type: status === 'SUSPENDED' ? 'SUSPEND_USER' : status === 'BANNED' ? 'BAN_USER' : 'UNSUSPEND_USER', entityType: 'user', entityId: userId, reason: reason ?? 'Admin action' } });
    });
    return { success: true };
  }

  async getPendingSpaces(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { status: ParkingSpaceStatus.PENDING_APPROVAL };
    const [data, total] = await Promise.all([
      this.prisma.parkingSpace.findMany({ where, skip, take: limit, orderBy: { createdAt: 'asc' }, include: { owner: { include: { profile: true } }, images: { take: 1 } } }),
      this.prisma.parkingSpace.count({ where }),
    ]);
    return { data: data.map((s) => ({ ...s, pricePerHour: s.pricePerHour.toNumber(), totalRevenue: s.totalRevenue.toNumber() })), total, page, limit };
  }

  async approveSpace(spaceId: string, adminId: string) {
    const space = await this.prisma.parkingSpace.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException();
    if (space.status !== ParkingSpaceStatus.PENDING_APPROVAL) throw new BadRequestException('Space is not pending approval');
    await this.prisma.$transaction(async (tx) => {
      await tx.parkingSpace.update({ where: { id: spaceId }, data: { status: ParkingSpaceStatus.ACTIVE, approvedAt: new Date(), approvedBy: adminId } });
      await tx.adminAction.create({ data: { adminId, type: 'APPROVE_PARKING_SPACE', entityType: 'parking_space', entityId: spaceId, reason: 'Approved by admin' } });
    });
    return { success: true };
  }

  async rejectSpace(spaceId: string, adminId: string, reason: string) {
    const space = await this.prisma.parkingSpace.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException();
    await this.prisma.$transaction(async (tx) => {
      await tx.parkingSpace.update({ where: { id: spaceId }, data: { status: ParkingSpaceStatus.REJECTED, rejectedAt: new Date(), rejectedBy: adminId, rejectionReason: reason } });
      await tx.adminAction.create({ data: { adminId, type: 'REJECT_PARKING_SPACE', entityType: 'parking_space', entityId: spaceId, reason } });
    });
    return { success: true };
  }

  async getAdminActions(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.adminAction.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { admin: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } } }),
      this.prisma.adminAction.count(),
    ]);
    return { data, total, page, limit };
  }
}
