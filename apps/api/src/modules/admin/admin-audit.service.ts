import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  actorId?: string;
  subjectId?: string;
  action?: AuditAction;
  entityType?: string;
  from?: string;
  to?: string;
}

export interface AdminActionFilter {
  page?: number;
  limit?: number;
  adminId?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Audit Log Search ──────────────────────────────────────────────────────

  async getAuditLogs(filter: AuditLogFilter) {
    const { page = 1, limit = 50, actorId, subjectId, action, entityType, from, to } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (subjectId) where.subjectId = subjectId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          subject: { select: { email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Admin Action Log ──────────────────────────────────────────────────────

  async getAdminActions(filter: AdminActionFilter) {
    const { page = 1, limit = 50, adminId, entityType, from, to } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Activity Timeline for Entity ─────────────────────────────────────────

  async getEntityTimeline(entityType: string, entityId: string) {
    const [auditLogs, adminActions] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { email: true } } },
      }),
      this.prisma.adminAction.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'asc' },
        include: { admin: { select: { email: true } } },
      }),
    ]);

    const timeline = [
      ...auditLogs.map((l) => ({ type: 'audit', source: 'system', ...l })),
      ...adminActions.map((a) => ({ ...a, type: 'admin_action', source: 'admin' })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { entityType, entityId, timeline };
  }

  // ─── Audit Summary Stats ───────────────────────────────────────────────────

  async getAuditSummary() {
    const since = new Date(Date.now() - 7 * 86400000);

    const [byAction, byAdmin, totalLogs] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.adminAction.groupBy({
        by: ['adminId'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
    ]);

    const adminIds = byAdmin.map((a) => a.adminId);
    const admins = await this.prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, email: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, a.email]));

    return {
      period: '7d',
      totalLogs,
      byAction: byAction.reduce((acc, r) => ({ ...acc, [r.action]: r._count.id }), {}),
      mostActiveAdmins: byAdmin.map((a) => ({
        adminId: a.adminId,
        email: adminMap.get(a.adminId) ?? 'unknown',
        actionCount: a._count.id,
      })),
    };
  }
}
