import mongoose from 'mongoose';

const minutesSchema = new mongoose.Schema({
  summary: { type: String, default: '' },
  discussionPoints: [{ type: String, trim: true }],
  decisions: [{ type: String, trim: true }],
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date }
}, { _id: false });

const committeeMeetingSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true, index: true },
  startTime: { type: String, required: true },
  endTime: { type: String, default: '' },
  location: { type: String, default: '' },
  agenda: [{ type: String, trim: true }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED', index: true },
  minutes: { type: minutesSchema, default: null },
  attachments: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

committeeMeetingSchema.index({ societyId: 1, status: 1, date: 1 });

export const CommitteeMeeting = mongoose.model('CommitteeMeeting', committeeMeetingSchema);
