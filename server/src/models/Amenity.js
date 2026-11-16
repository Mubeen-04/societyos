import mongoose from 'mongoose';

const amenitySchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Amenity name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['CLUBHOUSE', 'SWIMMING_POOL', 'TENNIS_COURT', 'GYM', 'PARTY_HALL', 'BADMINTON_COURT', 'COMMUNITY_HALL', 'OTHER'],
      default: 'CLUBHOUSE'
    },
    capacityPerSlot: {
      type: Number,
      default: 1
    },
    slotDurationMinutes: {
      type: Number,
      default: 60
    },
    openingTime: {
      type: String,
      default: '06:00'
    },
    closingTime: {
      type: String,
      default: '22:00'
    },
    advanceBookingDaysLimit: {
      type: Number,
      default: 7
    },
    pricingType: {
      type: String,
      enum: ['FREE', 'PAID'],
      default: 'FREE'
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    rules: [
      {
        type: String
      }
    ],
    imageUrl: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

amenitySchema.index({ societyId: 1, name: 1 });

export const Amenity = mongoose.model('Amenity', amenitySchema);
