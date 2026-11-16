import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  yes: { type: Number, default: 0 },
  no: { type: Number, default: 0 },
  abstain: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  outcome: { type: String, enum: ['APPROVED', 'REJECTED', null], default: null },
  approvalThreshold: { type: Number, default: 0.5 },
  calculatedAt: { type: Date, default: null }
}, { _id: false });

const committeeProposalSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, enum: ['SECURITY', 'MAINTENANCE', 'FINANCE', 'INFRASTRUCTURE', 'AMENITIES', 'POLICY', 'OTHER'], default: 'OTHER' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [{ type: String }],
  votingStart: { type: Date, default: null, index: true },
  votingEnd: { type: Date, default: null, index: true },
  status: { type: String, enum: ['DRAFT', 'OPEN_FOR_VOTING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'DRAFT', index: true },
  result: { type: resultSchema, default: () => ({}) },
  approvedAt: { type: Date, default: null }
}, { timestamps: true });

committeeProposalSchema.index({ societyId: 1, status: 1, votingEnd: 1 });

const committeeVoteSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeProposal', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vote: { type: String, enum: ['YES', 'NO', 'ABSTAIN'], required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

committeeVoteSchema.index({ proposalId: 1, userId: 1 }, { unique: true });
committeeVoteSchema.index({ societyId: 1, proposalId: 1 });

export const CommitteeProposal = mongoose.model('CommitteeProposal', committeeProposalSchema);
export const CommitteeVote = mongoose.model('CommitteeVote', committeeVoteSchema);
