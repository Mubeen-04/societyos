import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    contactPerson: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    rating: {
      type: Number,
      default: 4.5
    },
    jobsCompleted: {
      type: Number,
      default: 0
    },
    openJobs: {
      type: Number,
      default: 0
    },
    avgResolutionDays: {
      type: Number,
      default: 1.5
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true
  }
);

vendorSchema.index({ societyId: 1, category: 1 });

export const Vendor = mongoose.model('Vendor', vendorSchema);
