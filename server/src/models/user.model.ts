import { db } from '../config/database';
import { User, Role } from '@prisma/client';

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department?: string | null;
}): Promise<User> {
  return db.user.create({ data });
}

export async function findByEmail(email: string): Promise<User | null> {
  return db.user.findUnique({ where: { email } });
}

export async function findById(id: number): Promise<User | null> {
  return db.user.findUnique({ where: { id } });
}
