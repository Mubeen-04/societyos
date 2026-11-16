import mongoose from 'mongoose';

const stripeWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['PROCESSING', 'PROCESSED', 'FAILED'], default: 'PROCESSING' },
  processedAt: { type: Date, default: null },
  lastError: { type: String, default: '' }
}, { timestamps: true });

export const StripeWebhookEvent = mongoose.model('StripeWebhookEvent', stripeWebhookEventSchema);
