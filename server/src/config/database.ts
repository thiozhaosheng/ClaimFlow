import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const db = new PrismaClient();

export async function connectDatabase() {
  try {
    await db.$connect();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Optional: Disconnect on application shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
});
