import express from 'express';
import {
  getParkingSlots,
  createParkingSlot,
  assignParkingSlot,
  getMyParking
} from '../controllers/parkingController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES, PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/slots', getParkingSlots);
router.post('/slots', requirePermission(PERMISSIONS.SOCIETY_CONFIGURATION), createParkingSlot);
router.post('/assign', requirePermission(PERMISSIONS.SOCIETY_CONFIGURATION), assignParkingSlot);
router.get('/my-slot', getMyParking);

export default router;
