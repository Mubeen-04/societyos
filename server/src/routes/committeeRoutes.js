import express from 'express';
import { PERMISSIONS } from '../constants/index.js';
import {
  addMember,
  approveProposal,
  castProposalVote,
  cancelProposal,
  closeProposalVoting,
  createActionItem,
  createDecision,
  createMeeting,
  createProposal,
  getActionItems,
  getDecisions,
  getMeeting,
  getMeetings,
  getMembers,
  getOverview,
  getProposal,
  getProposals,
  getSocietyPeople,
  publishProposal,
  recordMinutes,
  updateActionItem,
  updateDecisionStatus,
  updateMeeting,
  updateMember
} from '../controllers/committeeController.js';
import { protect } from '../middleware/auth.js';
import { requireAnyPermission, requireAnySocietyPermission, requirePermission, requireSocietyPermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
router.use(protect, tenantGuard);

router.get('/overview', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getOverview);

router.get('/members', requireAnyPermission(PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.MANAGE_COMMITTEE, PERMISSIONS.USER_MANAGEMENT), getMembers);
router.post('/members', requireAnySocietyPermission(PERMISSIONS.MANAGE_COMMITTEE, PERMISSIONS.USER_MANAGEMENT), addMember);
router.patch('/members/:id', requireAnySocietyPermission(PERMISSIONS.MANAGE_COMMITTEE, PERMISSIONS.USER_MANAGEMENT), updateMember);
router.get('/people', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getSocietyPeople);

router.get('/meetings', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getMeetings);
router.post('/meetings', requireSocietyPermission(PERMISSIONS.MANAGE_MEETINGS), upload.array('attachments', 5), createMeeting);
router.get('/meetings/:id', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getMeeting);
router.patch('/meetings/:id', requireSocietyPermission(PERMISSIONS.MANAGE_MEETINGS), updateMeeting);
router.patch('/meetings/:id/minutes', requireSocietyPermission(PERMISSIONS.MANAGE_MEETINGS), recordMinutes);

router.get('/proposals', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getProposals);
router.post('/proposals', requireSocietyPermission(PERMISSIONS.CREATE_PROPOSAL), upload.array('attachments', 5), createProposal);
router.get('/proposals/:id', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getProposal);
router.patch('/proposals/:id/publish', requireSocietyPermission(PERMISSIONS.CREATE_PROPOSAL), publishProposal);
router.post('/proposals/:id/vote', requirePermission(PERMISSIONS.VOTE_ON_PROPOSAL), castProposalVote);
router.post('/proposals/:id/close', requireSocietyPermission(PERMISSIONS.APPROVE_PROPOSAL), closeProposalVoting);
router.post('/proposals/:id/approve', requireSocietyPermission(PERMISSIONS.APPROVE_PROPOSAL), approveProposal);
router.patch('/proposals/:id/cancel', requireAnySocietyPermission(PERMISSIONS.CREATE_PROPOSAL, PERMISSIONS.APPROVE_PROPOSAL), cancelProposal);

router.get('/decisions', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getDecisions);
router.post('/decisions', requireAnySocietyPermission(PERMISSIONS.APPROVE_PROPOSAL, PERMISSIONS.MANAGE_COMMITTEE), upload.array('attachments', 5), createDecision);
router.patch('/decisions/:id/status', updateDecisionStatus);

router.get('/action-items', requireAnyPermission(PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.VIEW_ASSIGNED_WORK), getActionItems);
router.post('/action-items', requireAnySocietyPermission(PERMISSIONS.MANAGE_COMMITTEE, PERMISSIONS.APPROVE_PROPOSAL), upload.array('attachments', 5), createActionItem);
router.patch('/action-items/:id', updateActionItem);

export default router;
