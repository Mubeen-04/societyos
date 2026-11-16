import mongoose from 'mongoose';

const amenityBookingSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    amenityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Amenity',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true
    },
    bookingDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true
    },
    startTime: {
      type: String, // Format: HH:MM
      required: true
    },
    endTime: {
      type: String, // Format: HH:MM
      required: true
    },
    attendeesCount: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'CONFIRMED',
      index: true
    },
    totalCharge: {
      type: Number,
      default: 0
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null
    },
    cancellationReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index to help query bookings for a specific slot
amenityBookingSchema.index(
  { societyId: 1, amenityId: 1, bookingDate: 1, startTime: 1, endTime: 1 }
);

export const AmenityBooking = mongoose.model('AmenityBooking', amenityBookingSchema);
