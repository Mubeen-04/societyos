import mongoose from 'mongoose';
import { PAYMENT_METHODS } from '../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceInvoice',
      default: null,
      index: true
    },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.CARD
    },
    provider: { type: String, enum: ['STRIPE', 'MANUAL', 'BANK', 'OTHER'], default: 'OTHER', index: true },
    providerSessionId: { type: String, default: undefined },
    providerPaymentIntentId: { type: String, default: undefined },
    transactionRef: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    receiptNumber: {
      type: String,
      default: undefined
    },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paidAt: { type: Date, default: null },
    refundedAmount: { type: Number, default: 0 },
    checkoutUrl: { type: String, default: '' },
    sessionExpiresAt: { type: Date, default: null },
    paymentGatewayResponse: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ societyId: 1, createdAt: -1 });
paymentSchema.index({ providerSessionId: 1 }, { unique: true, partialFilterExpression: { providerSessionId: { $type: 'string' } } });
paymentSchema.index({ providerPaymentIntentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ societyId: 1, invoiceId: 1, status: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
