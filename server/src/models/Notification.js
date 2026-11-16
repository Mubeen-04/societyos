import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../constants/index.js';

const notificationSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: ''
    },
    metadata: {
      type: Object,
      default: {}
    },
    idempotencyKey: { type: String, default: undefined },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Notification = mongoose.model('Notification', notificationSchema);
