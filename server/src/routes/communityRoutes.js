import express from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getPolls,
  createPoll,
  votePoll,
  getEvents,
  createEvent,
  rsvpEvent
} from '../controllers/communityController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ROLES, PERMISSIONS } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', requirePermission(PERMISSIONS.MANAGE_NOTICES), createAnnouncement);
router.delete('/announcements/:id', requirePermission(PERMISSIONS.MANAGE_NOTICES), deleteAnnouncement);

// Polls
router.get('/polls', getPolls);
router.post('/polls', requirePermission(PERMISSIONS.CREATE_PROPOSAL), createPoll);
router.post('/polls/:id/vote', votePoll);

// Events
router.get('/events', getEvents);
router.post('/events', requirePermission(PERMISSIONS.MANAGE_NOTICES), createEvent);
router.post('/events/:id/rsvp', rsvpEvent);

export default router;
