import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const emp = await db.user.create({
    data: {
      name: 'Employee One',
      email: 'employee@example.com',
      passwordHash,
      role: 'Employee',
      department: 'Sales',
    },
  });

  const mgr = await db.user.create({
    data: {
      name: 'Manager One',
      email: 'manager@example.com',
      passwordHash,
      role: 'Manager',
      department: 'Sales',
    },
  });

  const fin = await db.user.create({
    data: {
      name: 'Finance One',
      email: 'finance@example.com',
      passwordHash,
      role: 'FinanceAdmin',
    },
  });

  await db.claim.create({
    data: {
      userId: emp.id,
      amount: '34.50',
      category: 'Transport',
      expenseDate: new Date(),
    },
  });

  console.log('Seed data created');
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

