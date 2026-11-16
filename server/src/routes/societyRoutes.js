import express from 'express';
import {
  getCurrentSociety,
  updateSocietySettings,
  getBuildings,
  createBuilding,
  getApartments,
  createApartment,
  getUsers,
  updateUserRole,
  getFamilyMembers,
  addFamilyMember,
  deleteFamilyMember
} from '../controllers/societyController.js';
import { protect } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';

const router = express.Router();

router.use(protect, tenantGuard);

router.get('/current', getCurrentSociety);
router.put('/settings', requirePermission('SOCIETY_CONFIGURATION'), updateSocietySettings);

router.get('/buildings', getBuildings);
router.post('/buildings', requirePermission('SOCIETY_CONFIGURATION'), createBuilding);

router.get('/apartments', getApartments);
router.post('/apartments', requirePermission('SOCIETY_CONFIGURATION'), createApartment);

router.get('/users', requirePermission('USER_MANAGEMENT'), getUsers);
router.patch('/users/:id/role', requirePermission('USER_MANAGEMENT'), updateUserRole);

router.get('/family', getFamilyMembers);
router.post('/family', addFamilyMember);
router.delete('/family/:memberId', deleteFamilyMember);

export default router;
