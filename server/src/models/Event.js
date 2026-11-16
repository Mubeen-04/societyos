import mongoose from 'mongoose';

const eventRsvpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  userName: {
    type: String,
    required: true
  },
  guestsCount: {
    type: Number,
    default: 1
  },
  response: {
    type: String,
    enum: ['GOING', 'MAYBE', 'NOT_GOING'],
    default: 'GOING'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const eventSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    eventDate: {
      type: Date,
      required: true,
      index: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    bannerUrl: {
      type: String,
      default: ''
    },
    organizer: {
      type: String,
      default: 'Managing Committee'
    },
    rsvps: [eventRsvpSchema]
  },
  {
    timestamps: true
  }
);

eventSchema.index({ societyId: 1, eventDate: 1 });

export const Event = mongoose.model('Event', eventSchema);
