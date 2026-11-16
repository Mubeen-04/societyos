import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    category: {
      type: String,
      enum: ['GENERAL', 'WATER', 'ELECTRICITY', 'SECURITY', 'EVENT', 'URGENT', 'MAINTENANCE'],
      default: 'GENERAL'
    },
    priority: {
      type: String,
      enum: ['NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL'
    },
    pinned: {
      type: Boolean,
      default: false
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorName: {
      type: String,
      required: true
    },
    targetWings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building'
      }
    ],
    attachments: [{ type: String }]
  },
  {
    timestamps: true
  }
);

announcementSchema.index({ societyId: 1, createdAt: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
