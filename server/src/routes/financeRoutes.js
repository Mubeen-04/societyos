import express from 'express';
import {
  createExpense,
  decideExpenseApproval,
  getCollections,
  getExpenses,
  getFinanceCategories,
  getFinanceOverview,
  getFinanceReports,
  getTransactions,
  recordExpensePayment,
  submitExpense
} from '../controllers/financeController.js';
import { protect } from '../middleware/auth.js';
import { requireAnySocietyPermission, requireSocietyPermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { upload } from '../middleware/upload.js';
import { PERMISSIONS } from '../constants/index.js';

const router = express.Router();
router.use(protect, tenantGuard);

router.get('/overview', requireSocietyPermission(PERMISSIONS.VIEW_FINANCES), getFinanceOverview);
router.get('/collections', requireSocietyPermission(PERMISSIONS.VIEW_FINANCES), getCollections);
router.get('/outstanding', requireSocietyPermission(PERMISSIONS.VIEW_FINANCES), getCollections);
router.get('/categories', requireSocietyPermission(PERMISSIONS.MANAGE_EXPENSES), getFinanceCategories);
router.get('/expenses', requireSocietyPermission(PERMISSIONS.VIEW_FINANCES), getExpenses);
router.post('/expenses', requireSocietyPermission(PERMISSIONS.MANAGE_EXPENSES), upload.array('attachments', 5), createExpense);
router.post('/expenses/:id/submit', requireSocietyPermission(PERMISSIONS.MANAGE_EXPENSES), submitExpense);
router.post('/expenses/:id/approval', requireSocietyPermission(PERMISSIONS.APPROVE_EXPENSES), decideExpenseApproval);
router.post('/expenses/:id/payment', requireSocietyPermission(PERMISSIONS.PROCESS_PAYMENTS), recordExpensePayment);
router.get('/transactions', requireSocietyPermission(PERMISSIONS.VIEW_FINANCES), getTransactions);
router.get('/reports', requireAnySocietyPermission(PERMISSIONS.VIEW_FINANCES, PERMISSIONS.VIEW_FINANCIAL_REPORTS), getFinanceReports);

export default router;
