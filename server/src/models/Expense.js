import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  vendorName: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  invoiceDate: { type: Date, default: null },
  attachments: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAID', 'CANCELLED'], default: 'DRAFT', index: true },
  submittedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  governanceProposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeProposal', default: null },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null }
}, { timestamps: true });

expenseSchema.index({ societyId: 1, status: 1, createdAt: -1 });
expenseSchema.index({ societyId: 1, category: 1, paidAt: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
