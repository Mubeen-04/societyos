import mongoose from 'mongoose';
import { VISITOR_PURPOSES, VISITOR_APPROVAL_STATUS, VISITOR_ENTRY_STATUS } from '../constants/index.js';

const visitorSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    passCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    qrCodeData: {
      type: String,
      default: ''
    },
    visitorName: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true
    },
    visitorPhone: {
      type: String,
      required: [true, 'Visitor phone is required'],
      trim: true
    },
    purpose: {
      type: String,
      enum: Object.values(VISITOR_PURPOSES),
      default: VISITOR_PURPOSES.GUEST
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true,
      index: true
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: ''
    },
    visitorCount: {
      type: Number,
      default: 1,
      min: 1
    },
    passType: {
      type: String,
      enum: ['PRE_APPROVED', 'WALK_IN'],
      required: true
    },
    approvalStatus: {
      type: String,
      enum: Object.values(VISITOR_APPROVAL_STATUS),
      default: VISITOR_APPROVAL_STATUS.PENDING,
      index: true
    },
    entryStatus: {
      type: String,
      enum: Object.values(VISITOR_ENTRY_STATUS),
      default: VISITOR_ENTRY_STATUS.WAITING,
      index: true
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: true
    },
    actualEntryTime: {
      type: Date,
      default: null
    },
    actualExitTime: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guardInId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guardOutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

visitorSchema.index({ societyId: 1, entryStatus: 1 });
visitorSchema.index({ societyId: 1, residentId: 1 });
visitorSchema.index({ societyId: 1, createdAt: -1 });

export const Visitor = mongoose.model('Visitor', visitorSchema);
