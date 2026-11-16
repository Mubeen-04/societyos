import crypto from 'crypto';
import { Apartment } from '../models/Apartment.js';
import { AuditLog } from '../models/AuditLog.js';
import { FinancialTransaction } from '../models/FinancialTransaction.js';
import { MaintenanceInvoice } from '../models/MaintenanceInvoice.js';
import { Notification } from '../models/Notification.js';
import { Payment } from '../models/Payment.js';
import { Society } from '../models/Society.js';
import { StripeWebhookEvent } from '../models/StripeWebhookEvent.js';
import { User } from '../models/User.js';
import { INVOICE_STATUS, MAINTENANCE_PAYER_ROLES, PAYMENT_METHODS, ROLES } from '../constants/index.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';
import { createMaintenanceCheckoutSession, verifyStripeSignature } from '../services/stripeService.js';

const id = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
const payableStatuses = [INVOICE_STATUS.PENDING, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.PARTIAL, INVOICE_STATUS.PARTIALLY_PAID];
const amountInRupees = (paise) => Math.round(Number(paise || 0)) / 100;
const personalPaymentScope = (user) => {
  // Personal payment history and receipts belong to the logged-in payer.
  return { userId: user._id };
};

const residentOwnsBill = (user, invoice) => {
  const userId = user._id.toString();
  if (invoice.residentId?.toString() === userId) return true;
  const apartmentId = invoice.apartmentId?._id || invoice.apartmentId;
  const userApartmentId = user.apartmentId?._id || user.apartmentId;
  return Boolean(apartmentId && userApartmentId && apartmentId.toString() === userApartmentId.toString());
};

const ensureLedgerCredit = async ({ payment, invoice, actor, req = null }) => {
  const applied = await MaintenanceInvoice.findOneAndUpdate({
    _id: invoice._id,
    societyId: payment.societyId,
    status: { $in: payableStatuses },
    settledPaymentIds: { $ne: payment._id },
    $expr: { $gte: [{ $subtract: ['$payableAmount', { $ifNull: ['$amountPaid', 0] }] }, payment.amount] }
  }, [{ $set: {
    amountPaid: { $add: [{ $ifNull: ['$amountPaid', 0] }, payment.amount] },
    settledPaymentIds: { $setUnion: [{ $ifNull: ['$settledPaymentIds', []] }, [payment._id]] },
    status: { $cond: [{ $gte: [{ $add: [{ $ifNull: ['$amountPaid', 0] }, payment.amount] }, '$payableAmount'] }, INVOICE_STATUS.PAID, INVOICE_STATUS.PARTIALLY_PAID] },
    paidAt: { $cond: [{ $gte: [{ $add: [{ $ifNull: ['$amountPaid', 0] }, payment.amount] }, '$payableAmount'] }, new Date(), '$paidAt'] },
    paymentId: payment._id,
    checkoutPaymentId: null,
    checkoutLockToken: '',
    checkoutLockAt: null
  } }], { new: true });

  const current = applied || await MaintenanceInvoice.findOne({ _id: invoice._id, societyId: payment.societyId });
  const isSettled = current?.settledPaymentIds?.some((paymentId) => paymentId.toString() === payment._id.toString());
  if (!isSettled) {
    const error = new Error('The payment exceeds the remaining bill balance or the bill is no longer payable.');
    error.statusCode = 409;
    throw error;
  }

  await Payment.updateOne({ _id: payment._id, status: { $ne: 'REFUNDED' } }, { $set: { status: 'SUCCESS', paidAt: payment.paidAt || new Date() } });
  await FinancialTransaction.updateOne({ idempotencyKey: `PAYMENT:${payment._id}:SUCCESS` }, { $setOnInsert: {
    societyId: payment.societyId,
    direction: 'CREDIT', amount: payment.amount, category: 'MAINTENANCE',
    description: `Maintenance collection for ${invoice.billingMonth} (${invoice.invoiceNumber})`,
    reference: payment.paymentId, referenceType: 'MAINTENANCE_PAYMENT', invoiceId: invoice._id,
    paymentId: payment._id, createdBy: actor?._id || null, idempotencyKey: `PAYMENT:${payment._id}:SUCCESS`
  } }, { upsert: true });

  const auditRequest = req || { user: actor, societyId: payment.societyId, ip: 'stripe' };
  await logAudit({ req: auditRequest, action: 'PAYMENT_SUCCESSFUL', entity: 'Payment', entityId: payment._id,
    newState: { invoiceId: invoice._id, amount: payment.amount, receiptNumber: payment.receiptNumber }, idempotencyKey: `PAYMENT:${payment._id}:SUCCESS` });
  await createNotification({ societyId: payment.societyId, recipientId: payment.userId, type: 'PAYMENT_SUCCESS',
    title: 'Payment Receipt Available', message: `Payment of ₹${payment.amount.toLocaleString()} for invoice #${invoice.invoiceNumber} successful. Receipt #${payment.receiptNumber}.`,
    link: `/resident/bills`, metadata: { paymentId: payment._id, invoiceId: invoice._id }, idempotencyKey: `PAYMENT:${payment._id}:SUCCESS` });
  return current;
};

export const createCheckoutForInvoice = async (req, res, next) => {
  let lockToken;
  let payment;
  try {
    if (!MAINTENANCE_PAYER_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Only residents and society governance members can pay their own maintenance bills through Stripe Checkout.' });
    const invoiceId = req.params.id || req.body.invoiceId;
    let invoice = await MaintenanceInvoice.findOne({ _id: invoiceId, societyId: req.societyId }).populate('apartmentId');
    if (!invoice || !residentOwnsBill(req.user, invoice)) return res.status(404).json({ success: false, message: 'Maintenance bill not found.' });
    const balance = invoice.status === INVOICE_STATUS.PAID && !invoice.amountPaid ? 0 : Math.max(0, invoice.payableAmount - (invoice.amountPaid || 0));
    if (balance <= 0 || invoice.status === INVOICE_STATUS.CANCELLED) return res.status(409).json({ success: false, message: 'This bill has no outstanding balance.' });

    const existing = await Payment.findOne({ societyId: req.societyId, invoiceId: invoice._id, userId: req.user._id, provider: 'STRIPE', status: 'PENDING' }).sort({ createdAt: -1 });
    if (existing) {
      const currentPayment = await syncStripeSessionPayment(existing, req);
      if (currentPayment.status === 'SUCCESS') {
        return res.status(409).json({ success: false, message: 'This maintenance bill has already been paid.' });
      }
      if (currentPayment.status === 'PENDING' && currentPayment.checkoutUrl && currentPayment.sessionExpiresAt > new Date()) {
        return res.json({ success: true, data: { checkoutUrl: currentPayment.checkoutUrl, sessionId: currentPayment.providerSessionId, paymentId: currentPayment._id } });
      }
      if (currentPayment.status === 'PENDING') {
        currentPayment.status = 'CANCELLED';
        await currentPayment.save();
      }
      await MaintenanceInvoice.updateOne(
        { _id: invoice._id, societyId: req.societyId, checkoutPaymentId: currentPayment._id },
        { $set: { checkoutPaymentId: null, checkoutLockToken: '', checkoutLockAt: null } }
      );
    }

    lockToken = crypto.randomUUID();
    const now = new Date();
    const locked = await MaintenanceInvoice.findOneAndUpdate({
      _id: invoice._id, societyId: req.societyId, status: { $in: payableStatuses }, checkoutPaymentId: null,
      $expr: { $gt: [{ $subtract: ['$payableAmount', { $ifNull: ['$amountPaid', 0] }] }, 0] },
      $or: [{ checkoutLockAt: null }, { checkoutLockAt: { $lt: new Date(now.getTime() - 5 * 60 * 1000) } }]
    }, { $set: { checkoutLockToken: lockToken, checkoutLockAt: now } }, { new: true });
    if (!locked) return res.status(409).json({ success: false, message: 'A payment session is being created or this bill has already been settled.' });

    const payableAmount = Math.max(0, locked.payableAmount - (locked.amountPaid || 0));
    payment = await Payment.create({
      societyId: req.societyId, paymentId: id('PAY'), invoiceId: locked._id,
      userId: req.user._id, apartmentId: locked.apartmentId?._id || locked.apartmentId,
      amount: payableAmount, paymentMethod: PAYMENT_METHODS.CARD, provider: 'STRIPE',
      transactionRef: id('REF'), status: 'PENDING', receiptNumber: id('REC')
    });
    const society = await Society.findById(req.societyId).select('name settings.currency');
    const session = await createMaintenanceCheckoutSession({ payment, invoice: locked, society, user: req.user });
    if (!session.id || !session.url) throw Object.assign(new Error('Stripe returned an incomplete Checkout Session.'), { statusCode: 502 });
    payment.providerSessionId = session.id;
    payment.checkoutUrl = session.url;
    payment.sessionExpiresAt = session.expires_at ? new Date(session.expires_at * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    await payment.save();
    await MaintenanceInvoice.updateOne({ _id: locked._id, checkoutLockToken: lockToken }, { $set: { checkoutPaymentId: payment._id, checkoutLockToken: '', checkoutLockAt: null } });
    await logAudit({ req, action: 'STRIPE_CHECKOUT_CREATED', entity: 'Payment', entityId: payment._id, newState: { invoiceId: invoice._id, amount: payableAmount, sessionId: session.id } });
    res.status(201).json({ success: true, data: { checkoutUrl: session.url, sessionId: session.id, paymentId: payment._id } });
  } catch (error) {
    if (payment) { payment.status = 'FAILED'; await payment.save().catch(() => {}); }
    if (lockToken) await MaintenanceInvoice.updateOne({ checkoutLockToken: lockToken }, { $set: { checkoutLockToken: '', checkoutLockAt: null } }).catch(() => {});
    next(error);
  }
};

export const recordMaintenancePayment = async (req, res, next) => {
  try {
    const invoice = await MaintenanceInvoice.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Maintenance bill not found.' });
    const amount = Number(req.body.amount);
    const allowedMethods = [PAYMENT_METHODS.CASH, PAYMENT_METHODS.BANK_TRANSFER, PAYMENT_METHODS.UPI, PAYMENT_METHODS.CHEQUE, PAYMENT_METHODS.OTHER, PAYMENT_METHODS.CASH_OFFLINE];
    const balance = invoice.status === INVOICE_STATUS.PAID && !invoice.amountPaid ? 0 : Math.max(0, invoice.payableAmount - (invoice.amountPaid || 0));
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance || !allowedMethods.includes(req.body.paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Provide a valid payment amount no greater than the outstanding balance and a supported payment method.' });
    }
    const payment = await Payment.create({ societyId: req.societyId, paymentId: id('PAY'), invoiceId: invoice._id,
      userId: invoice.residentId, apartmentId: invoice.apartmentId, amount, paymentMethod: req.body.paymentMethod,
      provider: 'MANUAL', transactionRef: req.body.referenceNumber || id('REF'), status: 'PENDING', receiptNumber: id('REC'), recordedBy: req.user._id });
    const actor = await User.findById(invoice.residentId);
    const updatedInvoice = await ensureLedgerCredit({ payment, invoice, actor, req });
    await logAudit({ req, action: 'PAYMENT_RECEIVED', entity: 'Payment', entityId: payment._id, newState: { invoiceId: invoice._id, amount, receiptNumber: payment.receiptNumber } });
    res.status(201).json({ success: true, data: { payment: await Payment.findById(payment._id), invoice: updatedInvoice } });
  } catch (error) { next(error); }
};

export const stripeWebhook = async (req, res) => {
  if (!verifyStripeSignature(req.body, req.get('stripe-signature'))) return res.status(400).json({ success: false, message: 'Invalid Stripe webhook signature.' });
  let parsedEvent;
  try { parsedEvent = JSON.parse(req.body.toString('utf8')); }
  catch { return res.status(400).json({ success: false, message: 'Invalid Stripe event body.' }); }
  req.body = parsedEvent;
  req.stripeEvent = parsedEvent;
  return processVerifiedStripeEvent(req, res);
};

const processVerifiedStripeEvent = async (req, res) => {
  const event = req.stripeEvent;
  if (!event.id || !event.type) return res.status(400).json({ success: false, message: 'Invalid Stripe event.' });

  try {
    const record = await StripeWebhookEvent.findOneAndUpdate({ eventId: event.id }, { $setOnInsert: { eventId: event.id, type: event.type, status: 'PROCESSING' } }, { upsert: true, new: true });
    if (record.status === 'PROCESSED') return res.json({ received: true, duplicate: true });
    const object = event.data?.object || {};

    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.payment_status === 'paid') {
      const metadata = object.metadata || {};
      const payment = await Payment.findOne({ _id: metadata.paymentId, provider: 'STRIPE', providerSessionId: object.id, status: { $in: ['PENDING', 'SUCCESS'] } });
      if (!payment || payment.societyId.toString() !== metadata.societyId || payment.invoiceId.toString() !== metadata.maintenanceInvoiceId || payment.userId.toString() !== metadata.residentId || payment.apartmentId.toString() !== metadata.apartmentId || amountInRupees(object.amount_total) !== payment.amount || object.currency?.toLowerCase() !== 'inr') {
        throw Object.assign(new Error('Stripe Checkout Session does not match a pending maintenance payment.'), { statusCode: 400 });
      }
      payment.providerPaymentIntentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
      payment.paidAt ||= new Date((object.created || Math.floor(Date.now() / 1000)) * 1000);
      await payment.save();
      const invoice = await MaintenanceInvoice.findOne({ _id: payment.invoiceId, societyId: payment.societyId });
      if (!invoice) throw new Error('Maintenance bill for Stripe payment was not found.');
      const actor = await User.findById(payment.userId);
      await ensureLedgerCredit({ payment, invoice, actor });
    } else if (['checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) {
      const payment = await Payment.findOne({ providerSessionId: object.id, provider: 'STRIPE' });
      if (payment && payment.status === 'PENDING') {
        payment.status = event.type.endsWith('.expired') ? 'CANCELLED' : 'FAILED';
        await payment.save();
        await MaintenanceInvoice.updateOne({ _id: payment.invoiceId, checkoutPaymentId: payment._id }, { $set: { checkoutPaymentId: null } });
        const actor = await User.findById(payment.userId);
        if (actor) await logAudit({ req: { user: actor, societyId: payment.societyId, ip: 'stripe' }, action: event.type.endsWith('.expired') ? 'PAYMENT_CANCELLED' : 'PAYMENT_FAILED', entity: 'Payment', entityId: payment._id, newState: { status: payment.status }, idempotencyKey: `STRIPE_EVENT:${event.id}:AUDIT` });
        await createNotification({ societyId: payment.societyId, recipientId: payment.userId, type: 'PAYMENT_FAILED', title: payment.status === 'CANCELLED' ? 'Checkout expired' : 'Payment failed', message: `Payment for maintenance invoice was not completed. The bill remains outstanding.`, link: '/resident/bills', metadata: { paymentId: payment._id }, idempotencyKey: `STRIPE_EVENT:${event.id}:NOTIFICATION` });
      }
    } else if (event.type === 'refund.updated' && object.status === 'succeeded') {
      const payment = await Payment.findOne({ providerPaymentIntentId: object.payment_intent, status: { $in: ['SUCCESS', 'REFUNDED'] } });
      if (payment && payment.invoiceId && object.amount > 0 && amountInRupees(object.amount) <= Math.max(0, payment.amount - (payment.refundedAmount || 0)) && !(await MaintenanceInvoice.exists({ _id: payment.invoiceId, settledRefundIds: object.id }))) {
        const invoice = await MaintenanceInvoice.findOne({ _id: payment.invoiceId, societyId: payment.societyId });
        if (invoice) {
          const refundAmount = amountInRupees(object.amount);
          const refunded = await MaintenanceInvoice.findOneAndUpdate({ _id: invoice._id, societyId: payment.societyId, settledRefundIds: { $ne: object.id }, amountPaid: { $gte: refundAmount } }, [{ $set: {
            amountPaid: { $subtract: [{ $ifNull: ['$amountPaid', 0] }, refundAmount] },
            settledRefundIds: { $setUnion: [{ $ifNull: ['$settledRefundIds', []] }, [object.id]] },
            status: { $cond: [{ $lte: [{ $subtract: [{ $ifNull: ['$amountPaid', 0] }, refundAmount] }, 0] }, INVOICE_STATUS.PENDING, INVOICE_STATUS.PARTIALLY_PAID] },
            paidAt: null,
            checkoutPaymentId: null
          } }], { new: true });
          if (refunded) {
            payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;
            if (payment.refundedAmount >= payment.amount) payment.status = 'REFUNDED';
            await payment.save();
            const refundKey = `STRIPE_REFUND:${object.id}`;
            await FinancialTransaction.updateOne({ idempotencyKey: refundKey }, { $setOnInsert: { societyId: payment.societyId, direction: 'DEBIT', amount: refundAmount, category: 'REFUND', description: `Refund for maintenance payment ${payment.paymentId}`, reference: object.id, referenceType: 'REFUND', invoiceId: invoice._id, paymentId: payment._id, idempotencyKey: refundKey } }, { upsert: true });
            const actor = await User.findById(payment.userId);
            if (actor) {
              const auditReq = { user: actor, societyId: payment.societyId, ip: 'stripe' };
              await logAudit({ req: auditReq, action: 'PAYMENT_REFUNDED', entity: 'Payment', entityId: payment._id, newState: { refundId: object.id, amount: refundAmount, status: payment.status }, idempotencyKey: refundKey });
              await createNotification({ societyId: payment.societyId, recipientId: payment.userId, type: 'PAYMENT_REFUNDED', title: 'Maintenance payment refunded', message: `A refund of ₹${refundAmount.toLocaleString()} was recorded for maintenance invoice #${invoice.invoiceNumber}.`, link: '/resident/bills', metadata: { paymentId: payment._id, invoiceId: invoice._id, refundId: object.id }, idempotencyKey: `${refundKey}:NOTIFICATION` });
            }
          }
        }
      }
    }

    await StripeWebhookEvent.updateOne({ eventId: event.id }, { $set: { status: 'PROCESSED', processedAt: new Date(), lastError: '' } });
    return res.json({ received: true });
  } catch (error) {
    await StripeWebhookEvent.updateOne({ eventId: event.id }, { $set: { status: 'FAILED', lastError: error.message } }).catch(() => {});
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Stripe webhook processing failed.' });
  }
};

export const syncStripeSessionPayment = async (payment, req = null) => {
  if (!payment || payment.status === 'SUCCESS' || !payment.providerSessionId) return payment;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return payment;

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(payment.providerSessionId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`
      }
    });
    const session = await res.json();
    if (res.ok && session.payment_status === 'paid') {
      payment.providerPaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      payment.paidAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000);
      payment.status = 'SUCCESS';
      await payment.save();

      const invoice = await MaintenanceInvoice.findOne({ _id: payment.invoiceId, societyId: payment.societyId });
      if (invoice) {
        // Clear any stale checkout lock that might block ensureLedgerCredit
        if (invoice.checkoutPaymentId && invoice.checkoutPaymentId.toString() !== payment._id.toString()) {
          await MaintenanceInvoice.updateOne(
            { _id: invoice._id, checkoutPaymentId: { $ne: payment._id } },
            { $set: { checkoutPaymentId: null, checkoutLockToken: '', checkoutLockAt: null } }
          );
          invoice.checkoutPaymentId = null;
        }
        const actor = await User.findById(payment.userId);
        await ensureLedgerCredit({ payment, invoice, actor, req });
      }
      return await Payment.findById(payment._id);
    }
    if (res.ok && session.status === 'expired') {
      payment.status = 'CANCELLED';
      await payment.save();
      await logAudit({
        req,
        action: 'PAYMENT_CANCELLED',
        entity: 'Payment',
        entityId: payment._id,
        newState: { status: payment.status, reason: 'STRIPE_SESSION_EXPIRED' },
        idempotencyKey: `STRIPE_SESSION_EXPIRED:${payment._id}:AUDIT`
      });
      await MaintenanceInvoice.updateOne(
        { _id: payment.invoiceId, societyId: payment.societyId, checkoutPaymentId: payment._id },
        { $set: { checkoutPaymentId: null, checkoutLockToken: '', checkoutLockAt: null } }
      );
      return await Payment.findById(payment._id);
    }
  } catch (err) {
    console.error('Error syncing Stripe session directly:', err.message);
  }
  return payment;
};

export const getPaymentStatusBySession = async (req, res, next) => {
  try {
    let payment = await Payment.findOne({ providerSessionId: req.params.sessionId, societyId: req.societyId, userId: req.user._id, provider: 'STRIPE' });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment session not found.' });

    if (payment.status === 'PENDING') {
      payment = await syncStripeSessionPayment(payment, req);
    }

    const populated = await Payment.findById(payment._id).populate('invoiceId', 'invoiceNumber billingMonth status payableAmount amountPaid');
    res.json({ success: true, data: { status: populated.status, amount: populated.amount, paymentId: populated._id, receiptNumber: populated.receiptNumber, transactionRef: populated.transactionRef, invoice: populated.invoiceId } });
  } catch (error) { next(error); }
};

export const getResidentReceipt = async (req, res, next) => {
  try {
    const query = { _id: req.params.id, societyId: req.societyId, status: 'SUCCESS' };
    if (MAINTENANCE_PAYER_ROLES.includes(req.user.role)) Object.assign(query, personalPaymentScope(req.user));
    const payment = await Payment.findOne(query).populate('userId', 'name email phone').populate('invoiceId').populate('apartmentId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment receipt not found.' });
    const society = await Society.findById(req.societyId).select('name address');
    res.json({ success: true, data: { payment, society } });
  } catch (error) { next(error); }
};

export const getFinancePayments = async (req, res, next) => {
  try {
    const query = { societyId: req.societyId };
    if (MAINTENANCE_PAYER_ROLES.includes(req.user.role)) Object.assign(query, personalPaymentScope(req.user));
    const payments = await Payment.find(query).populate('userId', 'name email').populate('invoiceId', 'invoiceNumber billingMonth').populate('expenseId', 'title category').populate('apartmentId', 'unitNumber').sort({ createdAt: -1 }).limit(Math.min(100, Number(req.query.limit) || 30));
    res.json({ success: true, data: payments });
  } catch (error) { next(error); }
};
