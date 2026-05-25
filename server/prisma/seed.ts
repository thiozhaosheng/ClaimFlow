import { PrismaClient, Role, ClaimStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { DATABASE_URL } from '../src/config/constants';

dotenv.config();

// Ensure the seed client uses the same hardcoded URL as the application
const db = new PrismaClient({
  datasources: {
    db: { url: DATABASE_URL },
  },
});

async function main() {
  // 1. Cleanup existing data to allow re-running the seed script
  console.log('Cleaning up database...');
  await db.auditLog.deleteMany({});
  await db.claim.deleteMany({});
  await db.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('Creating users...');
  const employee = await db.user.create({
    data: {
      name: 'Employee One',
      email: 'employee@example.com',
      passwordHash,
      role: Role.Employee,
      department: 'Sales',
    },
  });

  await db.user.create({
    data: {
      name: 'Manager One',
      email: 'manager@example.com',
      passwordHash,
      role: Role.Manager,
      department: 'Sales',
    },
  });

  await db.user.create({
    data: {
      name: 'Finance One',
      email: 'finance@example.com',
      passwordHash,
      role: Role.FinanceAdmin,
    },
  });

  console.log('Creating sample claim...');
  await db.claim.create({
    data: {
      userId: employee.id,
      amount: 34.50,
      category: 'Transport',
      expenseDate: new Date(),
      status: ClaimStatus.Submitted,
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
