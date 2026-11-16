import express from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  submitFeedback
} from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES, PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.route('/')
  .get(getComplaints)
  .post(createComplaint);

router.get('/:id', getComplaintById);
router.patch('/:id/status', updateComplaintStatus);
router.post('/:id/assign', requirePermission(PERMISSIONS.MANAGE_COMPLAINTS), assignComplaint);
router.post('/:id/feedback', submitFeedback);

export default router;
