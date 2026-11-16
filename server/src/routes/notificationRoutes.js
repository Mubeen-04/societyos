import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;
