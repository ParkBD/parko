import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export interface UserSearchFilter {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: RoleType;
  search?: string;          // email or name
  createdFrom?: string;
  createdTo?: string;
}

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(filter: UserSearchFilter) {
    const { page = 1, limit = 20, status, role, search, createdFrom, createdTo } = filter;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (role) where.roles = { some: { role: { name: role } } };
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, phone: true, status: true,
          emailVerifiedAt: true, lastLoginAt: true, lastLoginIp: true,
          createdAt: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          roles: { select: { role: { select: { name: true } } } },
          wallet: { select: { balance: true, coinBalance: true, isFrozen: true } },
          _count: { select: { driverBookings: true, raisedDisputes: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: data.map(this.formatUser), total, page, limit };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        roles: { include: { role: true } },
        wallet: { select: { balance: true, coinBalance: true, isFrozen: true, frozenAt: true } },
        driverBookings: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true, bookingRef: true, status: true, totalAmount: true,
            startTime: true, endTime: true, createdAt: true,
            space: { select: { name: true, city: true } },
          },
        },
        _count: { select: { driverBookings: true, raisedDisputes: true, authoredReviews: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Recent login history from audit logs
    const loginHistory = await this.prisma.auditLog.findMany({
      where: { subjectId: userId, action: { in: ['LOGIN', 'FAILED_LOGIN'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, ipAddress: true, userAgent: true, createdAt: true },
    });

    return { ...this.formatUser(user), loginHistory };
  }

  async updateUserStatus(userId: string, status: UserStatus, adminId: string, reason: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === status) throw new BadRequestException(`User is already ${status}`);

    const actionTypeMap: Record<string, any> = {
      SUSPENDED: 'SUSPEND_USER',
      BANNED: 'BAN_USER',
      ACTIVE: 'UNSUSPEND_USER',
    };
    const actionType = actionTypeMap[status] ?? 'FLAG_USER';

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status } });
      await tx.adminAction.create({
        data: { adminId, type: actionType, entityType: 'user', entityId: userId, reason },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId, subjectId: userId,
          action: 'STATUS_CHANGE', entityType: 'user', entityId: userId,
          oldValues: { status: user.status },
          newValues: { status },
          metadata: { reason },
        },
      });
    });

    return { success: true, userId, newStatus: status };
  }

  async assignRole(userId: string, role: RoleType, adminId: string) {
    const [user, roleRecord] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } }),
      this.prisma.role.findUnique({ where: { name: role } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!roleRecord) throw new NotFoundException('Role not found');

    const exists = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId: roleRecord.id },
    });
    if (exists) throw new BadRequestException('User already has this role');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.create({ data: { userId, roleId: roleRecord.id } });
      await tx.adminAction.create({
        data: { adminId, type: 'ASSIGN_ROLE', entityType: 'user', entityId: userId, reason: `Role ${role} assigned` },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId, subjectId: userId,
          action: 'ROLE_CHANGE', entityType: 'user', entityId: userId,
          newValues: { addedRole: role },
        },
      });
    });

    return { success: true };
  }

  async revokeRole(userId: string, role: RoleType, adminId: string) {
    const roleRecord = await this.prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new NotFoundException('Role not found');

    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId: roleRecord.id },
    });
    if (!assignment) throw new BadRequestException('User does not have this role');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.delete({ where: { id: assignment.id } });
      await tx.adminAction.create({
        data: { adminId, type: 'REVOKE_ROLE', entityType: 'user', entityId: userId, reason: `Role ${role} revoked` },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId, subjectId: userId,
          action: 'ROLE_CHANGE', entityType: 'user', entityId: userId,
          oldValues: { removedRole: role },
        },
      });
    });

    return { success: true };
  }

  private formatUser(u: any) {
    return {
      ...u,
      wallet: u.wallet
        ? {
            ...u.wallet,
            balance: u.wallet.balance?.toNumber?.() ?? u.wallet.balance,
          }
        : null,
      roles: u.roles?.map((r: any) => r.role?.name ?? r) ?? [],
    };
  }
}
