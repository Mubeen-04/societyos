import crypto from 'crypto';
import { ENV } from '../config/env.js';

const stripeSecretKey = () => process.env.STRIPE_SECRET_KEY || ENV.STRIPE_SECRET_KEY;
const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || ENV.STRIPE_WEBHOOK_SECRET;

export const createMaintenanceCheckoutSession = async ({ payment, invoice, society, user }) => {
  const secret = stripeSecretKey();
  if (!secret) {
    const error = new Error('Stripe payments are not configured. Set STRIPE_SECRET_KEY on the server.');
    error.statusCode = 503;
    throw error;
  }

  const amountInSmallestUnit = Math.round(payment.amount * 100);
  if (amountInSmallestUnit < 1) {
    const error = new Error('The bill has no payable balance.');
    error.statusCode = 400;
    throw error;
  }

  const clientUrl = ENV.CLIENT_URL.replace(/\/$/, '');
  const form = new URLSearchParams({
    mode: 'payment',
    'success_url': `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${clientUrl}/payment/cancelled?bill_id=${invoice._id}`,
    client_reference_id: String(payment.paymentId),
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'inr',
    'line_items[0][price_data][unit_amount]': String(amountInSmallestUnit),
    'line_items[0][price_data][product_data][name]': `Maintenance ${invoice.billingMonth} · ${society.name}`,
    'line_items[0][price_data][product_data][description]': `Invoice ${invoice.invoiceNumber}`,
    'metadata[societyId]': String(invoice.societyId),
    'metadata[maintenanceInvoiceId]': String(invoice._id),
    'metadata[residentId]': String(user._id),
    'metadata[apartmentId]': String(invoice.apartmentId),
    'metadata[paymentId]': String(payment._id),
    'payment_intent_data[metadata][societyId]': String(invoice.societyId),
    'payment_intent_data[metadata][maintenanceInvoiceId]': String(invoice._id),
    'payment_intent_data[metadata][residentId]': String(user._id),
    'payment_intent_data[metadata][apartmentId]': String(invoice.apartmentId),
    'payment_intent_data[metadata][paymentId]': String(payment._id)
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `maintenance-checkout-${payment._id}`
    },
    body: form
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Stripe could not create a Checkout Session.');
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return data;
};

export const verifyStripeSignature = (rawBody, signatureHeader, secret = webhookSecret(), nowSeconds = Math.floor(Date.now() / 1000)) => {
  if (!secret || !Buffer.isBuffer(rawBody) || !signatureHeader) return false;
  const fields = signatureHeader.split(',').reduce((result, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) (result[key] ||= []).push(value);
    return result;
  }, {});
  const timestamp = Number(fields.t?.[0]);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || !fields.v1?.length) return false;

  const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]);
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest();
  return fields.v1.some((candidate) => {
    if (!/^[a-f\d]{64}$/i.test(candidate)) return false;
    const actual = Buffer.from(candidate, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
};
