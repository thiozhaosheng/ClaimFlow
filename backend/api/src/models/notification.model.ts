import { db } from '../config/database';
import { Notification, Prisma } from '@prisma/client';

export async function createNotification(
  data: Prisma.NotificationUncheckedCreateInput,
): Promise<Notification> {
  return db.notification.create({ data });
}

export async function listForRecipient(recipientId: number, limit = 30) {
  return db.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      claim: {
        select: {
          id: true,
          amount: true,
          category: true,
          merchant: true,
          status: true,
          user: { select: { id: true, name: true, email: true, department: true } },
        },
      },
    },
  });
}

export async function unreadCount(recipientId: number): Promise<number> {
  return db.notification.count({
    where: { recipientId, readAt: null },
  });
}

export async function markRead(id: number, recipientId: number): Promise<Notification | null> {
  // Scope to recipient so a caller can't ack someone else's notifications.
  const result = await db.notification.updateMany({
    where: { id, recipientId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) return null;
  return db.notification.findUnique({ where: { id } });
}

export async function markAllRead(recipientId: number): Promise<number> {
  const result = await db.notification.updateMany({
    where: { recipientId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
