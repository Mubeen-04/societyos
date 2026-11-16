import mongoose from 'mongoose';

const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Society name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Society unique code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    settings: {
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      lateFinePercentage: { type: Number, default: 5 },
      proposalApprovalThreshold: { type: Number, default: 0.5, min: 0.01, max: 1 },
      financePolicy: {
        treasurerOnlyMax: { type: Number, default: 10000, min: 0 },
        chairmanApprovalThreshold: { type: Number, default: 10000, min: 0 },
        governanceReviewThreshold: { type: Number, default: 50000, min: 0 }
      },
      visitorApprovalRequired: { type: Boolean, default: true },
      quietHours: {
        start: { type: String, default: '22:00' },
        end: { type: String, default: '06:00' }
      }
    }
  },
  {
    timestamps: true
  }
);

societySchema.index({ name: 1 });

export const Society = mongoose.model('Society', societySchema);
