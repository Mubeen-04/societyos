import express from 'express';
import {
  preApproveVisitor,
  registerWalkIn,
  handleVisitorDecision,
  verifyPass,
  checkInVisitor,
  checkOutVisitor,
  getActiveVisitors,
  getVisitors
} from '../controllers/visitorController.js';
import { protect } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/', getVisitors);
router.post('/pre-approve', preApproveVisitor);
router.post('/walk-in', requirePermission(PERMISSIONS.MANAGE_VISITORS), registerWalkIn);
router.patch('/:id/decision', handleVisitorDecision);
router.post('/verify-pass', requirePermission(PERMISSIONS.MANAGE_VISITORS), verifyPass);
router.post('/:id/check-in', requirePermission(PERMISSIONS.MANAGE_VISITORS), checkInVisitor);
router.post('/:id/check-out', requirePermission(PERMISSIONS.MANAGE_VISITORS), checkOutVisitor);
router.get('/active', requirePermission(PERMISSIONS.MANAGE_VISITORS), getActiveVisitors);

export default router;
