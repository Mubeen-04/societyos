import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entity: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true
    },
    previousState: {
      type: Object,
      default: null
    },
    newState: {
      type: Object,
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    },
    idempotencyKey: { type: String, default: undefined }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ societyId: 1, createdAt: -1 });
auditLogSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
