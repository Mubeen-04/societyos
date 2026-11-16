import mongoose from 'mongoose';

const buildingSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Building/Wing name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Wing code is required'],
      uppercase: true,
      trim: true
    },
    floorsCount: {
      type: Number,
      required: true,
      default: 4
    },
    totalUnits: {
      type: Number,
      required: true,
      default: 16
    }
  },
  {
    timestamps: true
  }
);

buildingSchema.index({ societyId: 1, code: 1 }, { unique: true });

export const Building = mongoose.model('Building', buildingSchema);
