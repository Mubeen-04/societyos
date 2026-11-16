import express from 'express';
import {
  getDailyHelpList,
  getDailyHelpById,
  createDailyHelp,
  assignStaffToApartment,
  unassignStaffFromApartment,
  addStaffReview,
  verifyDailyHelpPass,
  checkInDailyHelp,
  checkOutDailyHelp,
  getActiveStaffInside
} from '../controllers/dailyHelpController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getDailyHelpList);
router.get('/active', getActiveStaffInside);
router.get('/:id', getDailyHelpById);
router.post('/', createDailyHelp);
router.post('/:id/assign', assignStaffToApartment);
router.delete('/:id/assign', unassignStaffFromApartment);
router.post('/:id/reviews', addStaffReview);
router.post('/verify-pass', verifyDailyHelpPass);
router.post('/:id/check-in', checkInDailyHelp);
router.post('/:id/check-out', checkOutDailyHelp);

export default router;
