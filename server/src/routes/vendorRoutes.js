import express from 'express';
import { getVendors, createVendor } from '../controllers/vendorController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES, PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/', getVendors);
router.post('/', requirePermission(PERMISSIONS.MANAGE_VENDORS), createVendor);

export default router;
