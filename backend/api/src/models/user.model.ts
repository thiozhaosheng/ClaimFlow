import { db } from '../config/database';
import { User, Role, Prisma } from '@prisma/client';

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return db.user.create({ data });
}

export async function findByEmail(email: string): Promise<User | null> {
  return db.user.findUnique({ where: { email } });
}

export async function findById(id: number): Promise<User | null> {
  return db.user.findUnique({ where: { id } });
}

export async function findAll(): Promise<User[]> {
  return db.user.findMany();
}

export async function update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
  return db.user.update({ where: { id }, data });
}
