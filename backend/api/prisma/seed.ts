import { PrismaClient, Role, ClaimStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const db = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'claimflow-demo';

async function main() {
  console.log('Cleaning up existing data...');
  await db.auditLog.deleteMany({});
  await db.claim.deleteMany({});
  await db.user.deleteMany({});

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Creating demo users...');
  const employee = await db.user.create({
    data: {
      name: 'Rachel Tan',
      email: 'demo.employee@claimflow.com',
      passwordHash,
      role: Role.Employee,
      department: 'Sales',
    },
  });

  await db.user.create({
    data: {
      name: 'Lim Wei Ming',
      email: 'demo.manager@claimflow.com',
      passwordHash,
      role: Role.Manager,
      department: 'Sales',
    },
  });

  await db.user.create({
    data: {
      name: 'Priya Kumar',
      email: 'demo.finance@claimflow.com',
      passwordHash,
      role: Role.FinanceAdmin,
    },
  });

  console.log('Creating sample claims...');
  await db.claim.createMany({
    data: [
      {
        userId: employee.id,
        amount: 28.5,
        category: 'Transport',
        expenseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        status: ClaimStatus.Pending,
      },
      {
        userId: employee.id,
        amount: 145.9,
        category: 'Meal',
        expenseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        status: ClaimStatus.Pending,
      },
      {
        userId: employee.id,
        amount: 320.0,
        category: 'Client Entertainment',
        expenseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        status: ClaimStatus.Endorsed,
      },
      {
        userId: employee.id,
        amount: 85.0,
        category: 'Medical (statutory)',
        expenseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
        status: ClaimStatus.Paid,
      },
    ],
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Demo accounts (password: ' + DEMO_PASSWORD + '):');
  console.log('  Employee:  demo.employee@claimflow.com');
  console.log('  Manager:   demo.manager@claimflow.com');
  console.log('  Finance:   demo.finance@claimflow.com');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
