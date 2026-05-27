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
