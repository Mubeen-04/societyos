import mongoose from 'mongoose';
import { DAILY_HELP_CATEGORIES } from '../constants/index.js';

const reviewSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const dailyHelpSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(DAILY_HELP_CATEGORIES),
      default: DAILY_HELP_CATEGORIES.MAID,
      index: true
    },
    passCode: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true
    },
    assignedUnits: [
      {
        apartmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Apartment'
        },
        residentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        assignedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isInside: {
      type: Boolean,
      default: false,
      index: true
    },
    lastEntryTime: {
      type: Date,
      default: null
    },
    lastExitTime: {
      type: Date,
      default: null
    },
    currentLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyHelpLog',
      default: null
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    reviews: [reviewSchema],
    photoUrl: {
      type: String,
      default: ''
    },
    vehicleNumber: {
      type: String,
      default: '',
      trim: true
    },
    idProof: {
      idType: { type: String, default: 'AADHAAR' },
      idNumber: { type: String, default: '' }
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

dailyHelpSchema.index({ societyId: 1, passCode: 1 }, { unique: true });
dailyHelpSchema.index({ societyId: 1, phone: 1 });

export const DailyHelp = mongoose.model('DailyHelp', dailyHelpSchema);
