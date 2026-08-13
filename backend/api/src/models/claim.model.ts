import { db } from '../config/database';
import { Claim, ClaimStatus, Prisma } from '@prisma/client';

export async function createClaim(data: Prisma.ClaimUncheckedCreateInput): Promise<Claim> {
  return db.claim.create({ data });
}

const userSelect = {
  user: {
    select: { id: true, name: true, email: true, department: true, role: true },
  },
} as const;

export async function getClaimsByUser(userId: number) {
  return db.claim.findMany({
    where: { userId, withdrawn: false },
    orderBy: { createdAt: 'desc' },
    include: userSelect,
  });
}

export async function getAllClaims() {
  return db.claim.findMany({
    where: { withdrawn: false },
    orderBy: { createdAt: 'desc' },
    include: userSelect,
  });
}

/**
 * Claims submitted by one department.
 *
 * An approving officer endorses for their own department — the queue says so
 * on screen, "Review and endorse claims from Sales only" — but the list
 * endpoint returned every claim in the company to any Manager. A Sales
 * approver was being handed Engineering's and HR's claims: amounts, merchants
 * and receipts, for people who do not report to them. The privacy notice
 * promises the opposite ("your assigned approver can see claims you submit
 * for their review"), and the UI filtering them out of the table did not stop
 * them being on the wire.
 */
export async function getClaimsByDepartment(department: string) {
  return db.claim.findMany({
    where: { withdrawn: false, user: { department } },
    orderBy: { createdAt: 'desc' },
    include: userSelect,
  });
}

export async function findById(id: number) {
  return db.claim.findUnique({
    where: { id },
    include: userSelect,
  });
}

export async function updateClaimStatus(id: number, status: ClaimStatus): Promise<Claim> {
  return db.claim.update({ where: { id }, data: { status } });
}

export async function updateClaim(
  id: number,
  data: Prisma.ClaimUncheckedUpdateInput,
): Promise<Claim> {
  return db.claim.update({ where: { id }, data });
}
