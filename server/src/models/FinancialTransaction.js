import mongoose from 'mongoose';

const financialTransactionSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, required: true },
  description: { type: String, required: true },
  reference: { type: String, required: true },
  referenceType: { type: String, enum: ['MAINTENANCE_PAYMENT', 'EXPENSE_PAYMENT', 'REFUND', 'ADJUSTMENT'], required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceInvoice', default: null },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  idempotencyKey: { type: String, required: true, unique: true }
}, { timestamps: true });

financialTransactionSchema.index({ societyId: 1, createdAt: -1 });
financialTransactionSchema.index({ societyId: 1, direction: 1, category: 1, createdAt: -1 });

export const FinancialTransaction = mongoose.model('FinancialTransaction', financialTransactionSchema);
