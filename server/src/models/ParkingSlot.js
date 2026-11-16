import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    slotNumber: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['RESIDENT', 'VISITOR', 'TWO_WHEELER', 'HANDICAP'],
      default: 'RESIDENT'
    },
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      default: null
    },
    floorLevel: {
      type: String,
      default: 'Ground Level'
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'],
      default: 'AVAILABLE'
    },
    assignedApartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      default: null
    },
    assignedResidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    vehicleType: {
      type: String,
      enum: ['FOUR_WHEELER', 'TWO_WHEELER', 'ELECTRIC_VEHICLE', null],
      default: null
    },
    vehicleNumber: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

parkingSlotSchema.index({ societyId: 1, slotNumber: 1 }, { unique: true });

export const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);
