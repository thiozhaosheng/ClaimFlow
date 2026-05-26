import { db } from '../config/database';
import { Claim, ClaimStatus, Prisma } from '@prisma/client';

export async function createClaim(data: Prisma.ClaimUncheckedCreateInput): Promise<Claim> {
  return db.claim.create({ data });
}

export async function getClaimsByUser(userId: number): Promise<Claim[]> {
  return db.claim.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function getAllClaims(): Promise<Claim[]> {
  return db.claim.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function findById(id: number): Promise<Claim | null> {
  return db.claim.findUnique({ where: { id } });
}

export async function updateClaimStatus(id: number, status: ClaimStatus): Promise<Claim> {
  return db.claim.update({ where: { id }, data: { status } });
}
