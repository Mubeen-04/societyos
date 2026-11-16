import express from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard, requirePermission('VIEW_AUDIT_LOGS'));

router.get('/', async (req, res, next) => {
  try {
    const { action, entity, page = 1, limit = 50 } = req.query;
    const query = { societyId: req.societyId };

    if (action) query.action = action;
    if (entity) query.entity = entity;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
