import mongoose from 'mongoose';
import { INVOICE_STATUS } from '../constants/index.js';

const invoiceItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['MAINTENANCE', 'WATER', 'PARKING', 'SINKING_FUND', 'SPECIAL_ASSESSMENT', 'OTHER'],
    default: 'MAINTENANCE'
  }
});

const maintenanceInvoiceSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true,
      index: true
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    billingMonth: {
      type: String, // e.g. "2026-09"
      required: true,
      index: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    items: [invoiceItemSchema],
    totalAmount: {
      type: Number,
      required: true
    },
    lateFee: {
      type: Number,
      default: 0
    },
    discount: { type: Number, default: 0, min: 0 },
    payableAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
      index: true
    },
    paidAt: {
      type: Date,
      default: null
    },
    amountPaid: { type: Number, default: 0, min: 0 },
    checkoutLockToken: { type: String, default: '' },
    checkoutLockAt: { type: Date, default: null },
    checkoutPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    settledPaymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
    settledRefundIds: [{ type: String }],
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

maintenanceInvoiceSchema.virtual('balanceAmount').get(function () {
  const legacyPaidAmount = this.status === INVOICE_STATUS.PAID && !this.amountPaid ? this.payableAmount : (this.amountPaid || 0);
  return Math.max(0, (this.payableAmount || 0) - legacyPaidAmount);
});

maintenanceInvoiceSchema.index({ societyId: 1, billingMonth: 1, apartmentId: 1 }, { unique: true });

export const MaintenanceInvoice = mongoose.model('MaintenanceInvoice', maintenanceInvoiceSchema);
