import mongoose from 'mongoose';

const expenseApprovalSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true },
  requiredRole: { type: String, enum: ['TREASURER', 'CHAIRMAN'], required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: '' },
  decidedAt: { type: Date, default: null }
}, { timestamps: true });

expenseApprovalSchema.index({ expenseId: 1, requiredRole: 1 }, { unique: true });
expenseApprovalSchema.index({ societyId: 1, requiredRole: 1, status: 1 });

export const ExpenseApproval = mongoose.model('ExpenseApproval', expenseApprovalSchema);
