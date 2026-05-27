import { PrismaClient } from '@prisma/client';
import { DATABASE_URL } from './constants';

export const db = new PrismaClient({
  datasources: {
    db: { url: DATABASE_URL },
  },
});

export async function connectDatabase() {
  try {
    await db.$connect();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

process.on('beforeExit', async () => {
  await db.$disconnect();
});
