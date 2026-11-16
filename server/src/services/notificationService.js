import { Notification } from '../models/Notification.js';

export const createNotification = async ({
  societyId,
  recipientId,
  type,
  title,
  message,
  link = '',
  metadata = {},
  idempotencyKey
}) => {
  try {
    if (idempotencyKey) {
      return await Notification.findOneAndUpdate(
        { idempotencyKey },
        { $setOnInsert: { societyId, recipientId, type, title, message, link, metadata, idempotencyKey } },
        { upsert: true, new: true }
      );
    }
    const notification = await Notification.create({
      societyId,
      recipientId,
      type,
      title,
      message,
      link,
      metadata
    });

    return notification;
  } catch (err) {
    console.error('Error sending notification:', err.message);
  }
};

export const broadcastSocietyAlert = async ({ societyId, type, title, message, link = '' }) => {
  try {
    // In pure REST mode, society alerts are delivered through the notifications ledger
    console.log(`📢 Society Alert [${societyId}]: ${title} - ${message}`);
  } catch (err) {
    console.error('Error broadcasting society alert:', err.message);
  }
};
