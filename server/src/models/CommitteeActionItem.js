import mongoose from 'mongoose';

const committeeActionItemSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeMeeting', default: null, index: true },
  decisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeDecision', default: null, index: true },
  deadline: { type: Date, default: null },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM', index: true },
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PENDING', index: true },
  attachments: [{ type: String }]
}, { timestamps: true });

committeeActionItemSchema.index({ societyId: 1, status: 1, deadline: 1 });

export const CommitteeActionItem = mongoose.model('CommitteeActionItem', committeeActionItemSchema);
