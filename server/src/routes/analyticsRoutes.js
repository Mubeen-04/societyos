import express from 'express';
import {
  getAdminAnalytics,
  getResidentSummary,
  getSecurityStats
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES, PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/overview', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getAdminAnalytics);
router.get('/resident-summary', authorize(ROLES.RESIDENT, ROLES.ADMIN), getResidentSummary);
router.get('/security-stats', requirePermission(PERMISSIONS.MANAGE_VISITORS), getSecurityStats);

export default router;
