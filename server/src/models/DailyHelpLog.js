import mongoose from 'mongoose';

const dailyHelpLogSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyHelp',
      required: true,
      index: true
    },
    entryTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    exitTime: {
      type: Date,
      default: null
    },
    guardInId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    guardOutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gateNumber: {
      type: String,
      default: 'Gate 1'
    }
  },
  { timestamps: true }
);

dailyHelpLogSchema.index({ societyId: 1, staffId: 1, entryTime: -1 });

export const DailyHelpLog = mongoose.model('DailyHelpLog', dailyHelpLogSchema);
