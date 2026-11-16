import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

await mongoose.connect('mongodb://localhost:27017/society-os');

const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
const Invoice = mongoose.model('MaintenanceInvoice', new mongoose.Schema({}, { strict: false }));

// 1. Cancel the stale PENDING payment (old session that was never completed)
const stale = await Payment.findOneAndUpdate(
  { paymentId: 'PAY-1794830158430-4B14C1E942', status: 'PENDING' },
  { $set: { status: 'CANCELLED' } },
  { new: true }
);
console.log('Cancelled stale payment:', stale?.paymentId, '->', stale?.status);

// 2. Clear the stale checkoutPaymentId lock on the invoice
const inv = await Invoice.findOneAndUpdate(
  { invoiceNumber: 'INV-202611-A102' },
  { $set: { checkoutPaymentId: null, checkoutLockToken: '', checkoutLockAt: null } },
  { new: true }
);
console.log('Invoice lock cleared. Status:', inv?.status, 'checkoutPaymentId:', inv?.checkoutPaymentId);

await mongoose.disconnect();
console.log('Done. Invoice is now ready for a fresh payment.');
