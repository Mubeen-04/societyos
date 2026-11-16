import mongoose from 'mongoose';
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES, COMPLAINT_STATUSES } from '../constants/index.js';

const complaintTimelineSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: Object.values(COMPLAINT_STATUSES),
    required: true
  },
  action: {
    type: String,
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actorName: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const complaintSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(COMPLAINT_CATEGORIES),
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(COMPLAINT_PRIORITIES),
      default: COMPLAINT_PRIORITIES.MEDIUM,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUSES),
      default: COMPLAINT_STATUSES.OPEN,
      index: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    attachments: [
      {
        type: String
      }
    ],
    timeline: [complaintTimelineSchema],
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedbackComments: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

complaintSchema.index({ societyId: 1, status: 1 });
complaintSchema.index({ societyId: 1, category: 1 });

export const Complaint = mongoose.model('Complaint', complaintSchema);
