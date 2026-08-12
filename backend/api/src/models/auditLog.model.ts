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

/**
 * The finance audit trail, and the CSV exported from it.
 *
 * The claim is included because the trail is read as a ledger: it has columns
 * for the amount, the department and the person who submitted the claim, and
 * none of that lives on the log row. Without it the table rendered S$0.00 down
 * the whole amount column, "—" for every department, and repeated the actor's
 * name under "Employee" — so the log said Lim Wei Ming approved a claim
 * belonging to Lim Wei Ming, for nothing, in no department. The CSV carried the
 * same three empty columns into whatever it was opened in.
 */
export async function getAllAuditLogs(): Promise<AuditLog[]> {
  return db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      executor: { select: { id: true, name: true, email: true, role: true } },
      claim: {
        select: {
          id: true,
          amount: true,
          category: true,
          user: { select: { name: true, department: true } },
        },
      },
    },
  });
}