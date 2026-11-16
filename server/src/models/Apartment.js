import mongoose from 'mongoose';

const apartmentSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
      index: true
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true
    },
    floorNumber: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE', 'STUDIO'],
      default: '2BHK'
    },
    areaSqFt: {
      type: Number,
      default: 1100
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['OCCUPIED', 'VACANT', 'UNDER_MAINTENANCE'],
      default: 'VACANT'
    }
  },
  {
    timestamps: true
  }
);

apartmentSchema.index({ societyId: 1, unitNumber: 1 }, { unique: true });
apartmentSchema.index({ societyId: 1, buildingId: 1 });

export const Apartment = mongoose.model('Apartment', apartmentSchema);
