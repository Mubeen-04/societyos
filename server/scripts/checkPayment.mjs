import mongoose from 'mongoose';
await mongoose.connect('mongodb://localhost:27017/society-os');

const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
const Invoice = mongoose.model('MaintenanceInvoice', new mongoose.Schema({}, { strict: false }));

const payments = await Payment.find({}).sort({ createdAt: -1 }).limit(6).lean();
console.log('Recent payments:');
payments.forEach(p => console.log(` - ${p.paymentId} | ${p.status} | session: ${(p.providerSessionId||'').substring(0,30)} | invoice: ${p.invoiceId}`));

const inv = await Invoice.findOne({ invoiceNumber: 'INV-202611-A102' }).lean();
console.log('\nInvoice INV-202611-A102:');
console.log(' status:', inv?.status);
console.log(' amountPaid:', inv?.amountPaid);
console.log(' payableAmount:', inv?.payableAmount);
console.log(' checkoutPaymentId:', inv?.checkoutPaymentId);
console.log(' checkoutLockAt:', inv?.checkoutLockAt);
console.log(' settledPaymentIds:', JSON.stringify(inv?.settledPaymentIds));

await mongoose.disconnect();
