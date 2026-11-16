import mongoose from 'mongoose';

const committeeDecisionSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeMeeting', default: null, index: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeProposal', default: null, index: true },
  responsiblePersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deadline: { type: Date, default: null },
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PENDING', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [{ type: String }]
}, { timestamps: true });

committeeDecisionSchema.index({ societyId: 1, status: 1, deadline: 1 });

export const CommitteeDecision = mongoose.model('CommitteeDecision', committeeDecisionSchema);
