import express from 'express';
import {
  generateMonthlyInvoices,
  getInvoices,
  getInvoiceById
} from '../controllers/billingController.js';
import { createCheckoutForInvoice, getFinancePayments, getPaymentStatusBySession, getResidentReceipt, recordMaintenancePayment } from '../controllers/stripePaymentController.js';
import { protect } from '../middleware/auth.js';
import { authorize, requireSocietyPermission } from '../middleware/rbac.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { MAINTENANCE_PAYER_ROLES, PERMISSIONS, ROLES } from '../constants/index.js';

const router = express.Router();

router.use(protect, tenantGuard);

const invoiceViewRoles = [...MAINTENANCE_PAYER_ROLES, ROLES.ADMIN];

router.post('/generate-monthly', requireSocietyPermission(PERMISSIONS.MANAGE_EXPENSES), generateMonthlyInvoices);
router.get('/invoices', authorize(...invoiceViewRoles), getInvoices);
router.get('/invoices/:id', authorize(...invoiceViewRoles), getInvoiceById);
router.post('/invoices/:id/pay', createCheckoutForInvoice);
router.post('/invoices/:id/record-payment', requireSocietyPermission(PERMISSIONS.PROCESS_PAYMENTS), recordMaintenancePayment);
router.post('/pay', createCheckoutForInvoice);
router.get('/payments/session/:sessionId', authorize(...MAINTENANCE_PAYER_ROLES), getPaymentStatusBySession);
router.get('/receipt/:id', authorize(...invoiceViewRoles), getResidentReceipt);
router.get('/payments', authorize(...invoiceViewRoles), getFinancePayments);

export default router;
