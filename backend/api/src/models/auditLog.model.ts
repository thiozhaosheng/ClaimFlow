import { db } from '../config/database';
import { AuditLog, Prisma } from '@prisma/client';

export async function createAuditLog(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
  return db.auditLog.create({ data });
}

export async function getAuditLogsByClaim(claimId: number) {
  return db.auditLog.findMany({
    where: { claimId },
    orderBy: { createdAt: 'asc' },
    include: { executor: { select: { id: true, name: true, email: true, role: true } } },
  });
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  return db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: { executor: { select: { id: true, name: true, email: true, role: true } } },
  });
}