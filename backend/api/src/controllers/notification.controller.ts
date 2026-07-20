import { Request, Response } from 'express';
import * as notif from '../models/notification.model';

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: In-app inbox for claim status events
 */

/**
 * @swagger
 * /api/notifications/my:
 *   get:
 *     summary: List notifications for the signed-in user (newest first)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications and unread count
 */
export const listMy = async (req: Request, res: Response) => {
  try {
    const [items, unread] = await Promise.all([
      notif.listForRecipient(req.user!.id, 30),
      notif.unreadCount(req.user!.id),
    ]);
    return res.status(200).json({
      status: 'success',
      data: { items, unread },
    });
  } catch (error: any) {
    console.error('[notifications.listMy]', error?.message ?? error);
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications'  });
  }
};

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Updated notification }
 *       404: { description: Not found or already read }
 */
export const markOneRead = async (req: Request, res: Response) => {
  try {
    const updated = await notif.markRead(Number(req.params.id), req.user!.id);
    if (!updated) return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Notification not found'  });
    return res.status(200).json({ status: 'success', data: { notification: updated } });
  } catch (error: any) {
    console.error('[notifications.markOneRead]', error?.message ?? error);
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to mark read'  });
  }
};

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all of the current user's unread notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Number of notifications marked read }
 */
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const count = await notif.markAllRead(req.user!.id);
    return res.status(200).json({ status: 'success', data: { count } });
  } catch (error: any) {
    console.error('[notifications.markAllRead]', error?.message ?? error);
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to mark all read'  });
  }
};

/**
 * @swagger
 * /api/notifications/live:
 *   get:
 *     summary: Subscribe to Server-Sent Events (SSE) for live notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
export const liveNotifications = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userId = req.user!.id;

  // Send an initial ping to establish connection
  res.write(': ping\n\n');

  const listener = (notification: any) => {
    if (notification.recipientId === userId) {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
  };

  notif.notificationEmitter.on('new', listener);

  // Keep connection alive with pings every 15s to prevent timeouts
  const interval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    notif.notificationEmitter.off('new', listener);
  });
};
