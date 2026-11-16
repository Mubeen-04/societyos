import express from 'express';
import {
  getAmenities,
  createAmenity,
  getAmenitySlots,
  bookAmenitySlot,
  cancelBooking,
  getMyBookings
} from '../controllers/amenityController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES } from '../constants/index.js';
import { PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/', getAmenities);
router.post('/', requirePermission(PERMISSIONS.SOCIETY_CONFIGURATION), createAmenity);

router.get('/bookings', getMyBookings);
router.get('/:id/slots', getAmenitySlots);
router.post('/book', bookAmenitySlot);
router.patch('/bookings/:id/cancel', cancelBooking);

export default router;
