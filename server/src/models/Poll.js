import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  votesCount: {
    type: Number,
    default: 0
  }
});

const pollSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    options: [pollOptionSchema],
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    totalVotes: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

pollSchema.index({ societyId: 1, status: 1 });

const pollVoteSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true
    },
    selectedOptionIndex: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Enforce strictly 1 vote per apartment
pollVoteSchema.index({ pollId: 1, apartmentId: 1 }, { unique: true });

export const Poll = mongoose.model('Poll', pollSchema);
export const PollVote = mongoose.model('PollVote', pollVoteSchema);
