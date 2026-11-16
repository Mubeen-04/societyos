import mongoose from 'mongoose';

const financeCategorySchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['EXPENSE'], default: 'EXPENSE' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

financeCategorySchema.index({ societyId: 1, name: 1 }, { unique: true });

export const FinanceCategory = mongoose.model('FinanceCategory', financeCategorySchema);
