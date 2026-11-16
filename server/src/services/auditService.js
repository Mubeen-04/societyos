import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({
  req,
  action,
  entity,
  entityId,
  previousState = null,
  newState = null,
  idempotencyKey
}) => {
  try {
    if (!req.user) return;

    const log = {
      societyId: req.societyId || req.user.societyId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action,
      entity,
      entityId: entityId.toString(),
      previousState,
      newState,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      ...(idempotencyKey ? { idempotencyKey } : {})
    };
    if (idempotencyKey) await AuditLog.updateOne({ idempotencyKey }, { $setOnInsert: log }, { upsert: true });
    else await AuditLog.create(log);
  } catch (error) {
    console.error('Failed to record audit log:', error.message);
  }
};
