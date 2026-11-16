import request from 'supertest';
import crypto from 'crypto';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { runSeed } from '../seeds/seed.js';
import { Payment } from '../src/models/Payment.js';
import { MaintenanceInvoice } from '../src/models/MaintenanceInvoice.js';
import { FinancialTransaction } from '../src/models/FinancialTransaction.js';
import { Apartment } from '../src/models/Apartment.js';
import { User } from '../src/models/User.js';

let adminToken;
let residentToken;
let guardToken;
let treasurerToken;
let chairmanToken;
let superAdminToken;
let residentApartmentId;
let pendingInvoiceId;
let testPollId;

beforeAll(async () => {
  await runSeed();

  // Login as Admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'mubeen.shaikh@societyos.com', password: 'Password123!' });
  adminToken = adminRes.body.data.token;

  // Login as Resident
  const resRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'priya.sharma@societyos.com', password: 'Password123!' });
  residentToken = resRes.body.data.token;
  residentApartmentId = resRes.body.data.user.apartment;

  // Login as Security Guard
  const guardRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ramesh.pawar@societyos.com', password: 'Password123!' });
  guardToken = guardRes.body.data.token;

  const treasurerRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nisha.rao@societyos.com', password: 'Password123!' });
  treasurerToken = treasurerRes.body.data.token;

  const chairmanRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'kavita.desai@societyos.com', password: 'Password123!' });
  chairmanToken = chairmanRes.body.data.token;

  const superAdminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'superadmin@societyos.com', password: 'Password123!' });
  superAdminToken = superAdminRes.body.data.token;
}, 60000);

afterAll(async () => {
  await disconnectDB();
});

describe('1. Authentication & Security RBAC', () => {
  test('POST /api/auth/login with valid credentials returns JWT token and user profile', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya.sharma@societyos.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('RESIDENT');
  });

  test('Treasurer login preserves the governance role and unit occupancy separately', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nisha.rao@societyos.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('TREASURER');
    expect(res.body.data.user.occupancyType).toBe('OWNER');
  });

  test('POST /api/auth/login with wrong password returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya.sharma@societyos.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Resident role cannot access Admin-only settings endpoint (Returns 403 FORBIDDEN)', async () => {
    const res = await request(app)
      .put('/api/societies/settings')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ settings: { lateFinePercentage: 10 } });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('Admin role CAN access and update society settings', async () => {
    const res = await request(app)
      .put('/api/societies/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ settings: { lateFinePercentage: 6 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('2. Multi-Tenant Society Isolation', () => {
  test('Request with foreign societyId parameter is blocked by tenantGuard (Returns 403 CROSS_TENANT_VIOLATION)', async () => {
    const fakeForeignSocietyId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .get(`/api/societies/buildings?societyId=${fakeForeignSocietyId}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CROSS_TENANT_VIOLATION');
  });
});

describe('3. Complaints Workflow & State Transitions', () => {
  let createdComplaintId;

  test('Resident can create a complaint ticket', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Water filter pressure low',
        description: 'Water filtration system experiencing low outflow pressure',
        category: 'PLUMBING',
        priority: 'MEDIUM'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketNumber).toMatch(/^CMP-2026-/);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.timeline.length).toBe(1);
    createdComplaintId = res.body.data._id;
  });

  test('Admin can transition complaint status with audit notes', async () => {
    const res = await request(app)
      .patch(`/api/complaints/${createdComplaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'IN_PROGRESS',
        notes: 'Technician dispatched to inspect plumbing filter'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.timeline.length).toBe(2);
  });
});

describe('4. Visitor Pass Pre-Approval & Verification', () => {
  let passCode;
  let visitorId;

  test('Resident can pre-approve a visitor and generate a pass', async () => {
    const res = await request(app)
      .post('/api/visitors/pre-approve')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Sanjay Dutt',
        visitorPhone: '+91 98999 11111',
        purpose: 'GUEST',
        vehicleNumber: 'MH-01-XX-9999'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.passCode).toMatch(/^VP-/);
    expect(res.body.data.approvalStatus).toBe('APPROVED');
    expect(res.body.data.entryStatus).toBe('WAITING');
    passCode = res.body.data.passCode;
    visitorId = res.body.data._id;
  });

  test('Security Guard can verify visitor pass by passCode', async () => {
    const res = await request(app)
      .post('/api/visitors/verify-pass')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ passCode });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.data.visitorName).toBe('Sanjay Dutt');
  });

  test('Security Guard can check-in verified visitor', async () => {
    const res = await request(app)
      .post(`/api/visitors/${visitorId}/check-in`)
      .set('Authorization', `Bearer ${guardToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.entryStatus).toBe('INSIDE');
    expect(res.body.data.actualEntryTime).toBeDefined();
  });
});

describe('5. Maintenance Invoices & Authoritative Payment Calculations', () => {
  let stripeSessionId;
  let stripePaymentId;

  test('Resident can view their pending maintenance invoice', async () => {
    const res = await request(app)
      .get('/api/billing/invoices')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const pendingInv = res.body.data.find(inv => inv.status === 'PENDING');
    expect(pendingInv).toBeDefined();
    expect(pendingInv.payableAmount).toBe(4800);
    pendingInvoiceId = pendingInv._id;
  });

  test('Treasurer can record a partial payment and resident cannot record payments manually', async () => {
    const forbidden = await request(app)
      .post(`/api/billing/invoices/${pendingInvoiceId}/record-payment`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ amount: 1000, paymentMethod: 'CASH' });
    expect(forbidden.status).toBe(403);

    const partial = await request(app)
      .post(`/api/billing/invoices/${pendingInvoiceId}/record-payment`)
      .set('Authorization', `Bearer ${treasurerToken}`)
      .send({ amount: 1000, paymentMethod: 'CASH' });
    expect(partial.status).toBe(201);
    expect(partial.body.data.invoice.status).toBe('PARTIALLY_PAID');
    expect(partial.body.data.invoice.amountPaid).toBe(1000);
    expect(partial.body.data.invoice.balanceAmount).toBe(3800);
  });

  test('Stripe checkout uses the server balance and webhook settles once', async () => {
    const oldSecret = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_finance_suite';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'cs_test_finance_suite', url: 'https://checkout.stripe.com/c/pay/cs_test_finance_suite', expires_at: Math.floor(Date.now() / 1000) + 3600 })
    });

    const res = await request(app)
      .post('/api/billing/pay')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        invoiceId: pendingInvoiceId,
        amount: 100
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checkoutUrl).toContain('checkout.stripe.com');
    stripeSessionId = res.body.data.sessionId;
    stripePaymentId = res.body.data.paymentId;
    const payment = await Payment.findById(stripePaymentId);
    expect(payment.amount).toBe(3800);
    expect(payment.status).toBe('PENDING');
    expect((await MaintenanceInvoice.findById(pendingInvoiceId)).status).toBe('PARTIALLY_PAID');

    const event = {
      id: 'evt_test_finance_settlement', type: 'checkout.session.completed',
      data: { object: {
        id: stripeSessionId, object: 'checkout.session', payment_status: 'paid', amount_total: 380000,
        currency: 'inr', payment_intent: 'pi_test_finance_suite', created: Math.floor(Date.now() / 1000),
        metadata: { societyId: payment.societyId.toString(), maintenanceInvoiceId: payment.invoiceId.toString(), residentId: payment.userId.toString(), apartmentId: payment.apartmentId.toString(), paymentId: payment._id.toString() }
      } }
    };
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', 'whsec_finance_suite').update(`${timestamp}.${payload}`).digest('hex');
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_finance_suite';
    const sendWebhook = () => request(app).post('/api/billing/stripe/webhook').set('Content-Type', 'application/json')
      .set('stripe-signature', `t=${timestamp},v1=${signature}`).send(payload);

    const webhook = await sendWebhook();
    expect(webhook.status).toBe(200);
    expect((await MaintenanceInvoice.findById(pendingInvoiceId)).status).toBe('PAID');
    expect((await MaintenanceInvoice.findById(pendingInvoiceId)).amountPaid).toBe(4800);
    expect((await Payment.findById(stripePaymentId)).status).toBe('SUCCESS');
    expect(await FinancialTransaction.countDocuments({ paymentId: stripePaymentId, direction: 'CREDIT' })).toBe(1);
    const duplicate = await sendWebhook();
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.duplicate).toBe(true);
    expect(await FinancialTransaction.countDocuments({ paymentId: stripePaymentId, direction: 'CREDIT' })).toBe(1);

    const refundEvent = { id: 'evt_test_finance_refund', type: 'refund.updated', data: { object: { id: 're_test_finance_refund', status: 'succeeded', amount: 380000, payment_intent: 'pi_test_finance_suite' } } };
    const refundPayload = JSON.stringify(refundEvent);
    const refundSignature = crypto.createHmac('sha256', 'whsec_finance_suite').update(`${timestamp}.${refundPayload}`).digest('hex');
    const refundResponse = await request(app).post('/api/billing/stripe/webhook').set('Content-Type', 'application/json')
      .set('stripe-signature', `t=${timestamp},v1=${refundSignature}`).send(refundPayload);
    expect(refundResponse.status).toBe(200);
    const refundedInvoice = await MaintenanceInvoice.findById(pendingInvoiceId);
    expect(refundedInvoice.status).toBe('PARTIALLY_PAID');
    expect(refundedInvoice.amountPaid).toBe(1000);
    expect((await Payment.findById(stripePaymentId)).status).toBe('REFUNDED');
    expect(await FinancialTransaction.countDocuments({ paymentId: stripePaymentId, direction: 'DEBIT' })).toBe(1);

    const foreignBill = await MaintenanceInvoice.findOne({ societyId: payment.societyId, residentId: { $ne: payment.userId }, status: { $ne: 'PAID' } });
    expect(foreignBill).toBeTruthy();
    const wrongResident = await request(app).post(`/api/billing/invoices/${foreignBill._id}/pay`)
      .set('Authorization', `Bearer ${residentToken}`);
    expect(wrongResident.status).toBe(404);

    fetchSpy.mockRestore();
    if (oldSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = oldSecret;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  test('Invalid signatures are rejected and failed or expired Checkout sessions never credit a bill', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_finance_suite';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_finance_suite';
    let sessionNumber = 0;
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => {
      sessionNumber += 1;
      return { ok: true, json: async () => ({ id: `cs_test_failure_${sessionNumber}`, url: `https://checkout.stripe.com/c/pay/cs_test_failure_${sessionNumber}`, expires_at: Math.floor(Date.now() / 1000) + 3600 }) };
    });
    const invalidSignature = await request(app).post('/api/billing/stripe/webhook')
      .set('Content-Type', 'application/json').set('stripe-signature', 't=1,v1=invalid').send('{"id":"evt_invalid"}');
    expect(invalidSignature.status).toBe(400);

    const invoice = await MaintenanceInvoice.findById(pendingInvoiceId);
    const sendStripeEvent = async (event) => {
      const payload = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000);
      const digest = crypto.createHmac('sha256', 'whsec_finance_suite').update(`${timestamp}.${payload}`).digest('hex');
      return request(app).post('/api/billing/stripe/webhook').set('Content-Type', 'application/json')
        .set('stripe-signature', `t=${timestamp},v1=${digest}`).send(payload);
    };

    for (const [index, type] of ['checkout.session.async_payment_failed', 'checkout.session.expired'].entries()) {
      const checkout = await request(app).post(`/api/billing/invoices/${invoice._id}/pay`).set('Authorization', `Bearer ${residentToken}`);
      expect(checkout.status).toBe(201);
      const paymentId = checkout.body.data.paymentId;
      const event = { id: `evt_test_non_success_${index}`, type, data: { object: { id: checkout.body.data.sessionId } } };
      const result = await sendStripeEvent(event);
      expect(result.status).toBe(200);
      expect((await Payment.findById(paymentId)).status).toBe(type.endsWith('.expired') ? 'CANCELLED' : 'FAILED');
      expect(await FinancialTransaction.exists({ paymentId, direction: 'CREDIT' })).toBeFalsy();
      expect((await MaintenanceInvoice.findById(invoice._id)).status).toBe('PARTIALLY_PAID');
    }
    fetchSpy.mockRestore();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
});

describe('5a. Seeded resident maintenance mapping and balances', () => {
  test('Each seeded resident invoice maps to that apartment owner or tenant and exposes the correct balance', async () => {
    const primaryResident = await User.findOne({ email: 'priya.sharma@societyos.com' });
    const otherResidentIds = (await User.find({ societyId: primaryResident.societyId, role: 'RESIDENT', _id: { $ne: primaryResident._id } }).select('_id')).map((resident) => resident._id);
    for (const status of ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']) {
      const invoice = await MaintenanceInvoice.findOne({ status, residentId: { $in: otherResidentIds } }).populate('residentId');
      expect(invoice).toBeTruthy();
      expect(invoice.residentId.role).toBe('RESIDENT');

      const apartment = await Apartment.findOne({ _id: invoice.apartmentId, societyId: invoice.societyId });
      const linkedResidentId = apartment.tenantId || apartment.ownerId;
      expect(linkedResidentId.toString()).toBe(invoice.residentId._id.toString());

      const login = await request(app).post('/api/auth/login')
        .send({ email: invoice.residentId.email, password: 'Password123!' });
      expect(login.status).toBe(200);
      const token = login.body.data.token;
      const summary = await request(app).get('/api/analytics/resident-summary').set('Authorization', `Bearer ${token}`);
      expect(summary.status).toBe(200);
      const expectedBalance = status === 'PAID' ? 0 : invoice.payableAmount - (invoice.amountPaid || 0);
      expect(summary.body.data.maintenanceDue).toBe(expectedBalance);

      const ownInvoices = await request(app).get('/api/billing/invoices').set('Authorization', `Bearer ${token}`);
      expect(ownInvoices.status).toBe(200);
      expect(ownInvoices.body.data.every((row) => String(row.residentId._id) === String(login.body.data.user.id))).toBe(true);
    }
  });

  test('A resident cannot retrieve another resident invoice, while Admin sees society collections', async () => {
    const primaryResident = await User.findOne({ email: 'priya.sharma@societyos.com' });
    const ownInvoice = await MaintenanceInvoice.findOne({ residentId: primaryResident._id });
    const foreignInvoice = await MaintenanceInvoice.findOne({ societyId: ownInvoice.societyId, residentId: { $ne: ownInvoice.residentId } });
    const denied = await request(app).get(`/api/billing/invoices/${foreignInvoice._id}`).set('Authorization', `Bearer ${residentToken}`);
    expect(denied.status).toBe(404);

    const collections = await request(app).get('/api/finance/collections').set('Authorization', `Bearer ${adminToken}`);
    expect(collections.status).toBe(200);
    expect(collections.body.data.bills.length).toBeGreaterThan(1);
    expect(collections.body.data.billed).toBeGreaterThan(0);
  });
});

describe('6. Polls & Single Vote per Apartment Constraint', () => {
  test('Duplicate poll voting from the same apartment is prevented (Returns 409 ALREADY_VOTED)', async () => {
    const pollsRes = await request(app)
      .get('/api/community/polls')
      .set('Authorization', `Bearer ${residentToken}`);

    testPollId = pollsRes.body.data[0]._id;

    // Seeded data already recorded residentUser's vote for this poll
    const voteRes = await request(app)
      .post(`/api/community/polls/${testPollId}/vote`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ optionIndex: 1 });

    expect(voteRes.status).toBe(409);
    expect(voteRes.body.code).toBe('ALREADY_VOTED');
  });
});

describe('7. Finance permissions and expense approvals', () => {
  test('Admin can generate selected-apartment billing once per period', async () => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billingMonth = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 15).toISOString();
    const body = { billingMonth, dueDate, baseMaintenance: 3500, waterCharges: 250, parkingCharges: 400, lateFee: 0, discount: 150, apartmentIds: [residentApartmentId] };
    const first = await request(app).post('/api/billing/generate-monthly').set('Authorization', `Bearer ${adminToken}`).send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.createdCount).toBe(1);
    const second = await request(app).post('/api/billing/generate-monthly').set('Authorization', `Bearer ${adminToken}`).send(body);
    expect(second.status).toBe(201);
    expect(second.body.data.createdCount).toBe(0);
    expect(second.body.data.skippedCount).toBe(1);
  });

  test('Finance overview is role-gated and SUPER_ADMIN is not a society finance officer', async () => {
    const admin = await request(app).get('/api/finance/overview').set('Authorization', `Bearer ${adminToken}`);
    const treasurer = await request(app).get('/api/finance/overview').set('Authorization', `Bearer ${treasurerToken}`);
    const resident = await request(app).get('/api/finance/overview').set('Authorization', `Bearer ${residentToken}`);
    const superAdmin = await request(app).get('/api/finance/overview').set('Authorization', `Bearer ${superAdminToken}`);
    expect(admin.status).toBe(200);
    expect(treasurer.status).toBe(200);
    expect(resident.status).toBe(403);
    expect(superAdmin.status).toBe(403);

    const reports = await request(app).get('/api/finance/reports').set('Authorization', `Bearer ${adminToken}`);
    expect(reports.status).toBe(200);
    expect(reports.body.data.income.length).toBeGreaterThan(0);
    expect(reports.body.data.expense.length).toBeGreaterThan(0);
    expect(reports.body.data.collections.length).toBeGreaterThan(0);
    expect(reports.body.data.outstanding.length).toBeGreaterThan(0);
    expect(reports.body.data.monthly.length).toBeGreaterThan(0);
    expect(reports.body.data.expenseByCategory.length).toBeGreaterThan(0);
  });

  test('Treasurer plus Chairman approval is required above the threshold; payment is recorded manually', async () => {
    const created = await request(app).post('/api/finance/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Pump repair invoice', category: 'Lift Maintenance', amount: 15000, vendorName: 'Local Maintenance Co', invoiceNumber: 'TEST-EXP-15K' });
    expect(created.status).toBe(201);
    const expenseId = created.body.data._id;
    const submitted = await request(app).post(`/api/finance/expenses/${expenseId}/submit`).set('Authorization', `Bearer ${adminToken}`);
    expect(submitted.status).toBe(200);

    const treasurerApproval = await request(app).post(`/api/finance/expenses/${expenseId}/approval`)
      .set('Authorization', `Bearer ${treasurerToken}`).send({ decision: 'APPROVED' });
    expect(treasurerApproval.status).toBe(200);
    expect(treasurerApproval.body.data.expense.status).toBe('UNDER_REVIEW');
    const chairmanApproval = await request(app).post(`/api/finance/expenses/${expenseId}/approval`)
      .set('Authorization', `Bearer ${chairmanToken}`).send({ decision: 'APPROVED' });
    expect(chairmanApproval.status).toBe(200);
    expect(chairmanApproval.body.data.expense.status).toBe('PAYMENT_PENDING');

    const paid = await request(app).post(`/api/finance/expenses/${expenseId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`).send({ paymentMethod: 'BANK_TRANSFER', referenceNumber: 'BANK-TEST-15K' });
    expect(paid.status).toBe(201);
    expect(paid.body.data.expense.status).toBe('PAID');
    expect(paid.body.data.payment.provider).toBe('BANK');
    expect(await FinancialTransaction.countDocuments({ expenseId, direction: 'DEBIT' })).toBe(1);
  });

  test('Expense creators cannot approve their own expenses', async () => {
    const created = await request(app).post('/api/finance/expenses')
      .set('Authorization', `Bearer ${treasurerToken}`)
      .send({ title: 'Small office supplies', category: 'Cleaning', amount: 2500 });
    expect(created.status).toBe(201);
    const expenseId = created.body.data._id;
    const submitted = await request(app).post(`/api/finance/expenses/${expenseId}/submit`).set('Authorization', `Bearer ${treasurerToken}`);
    expect(submitted.status).toBe(200);
    const selfApproval = await request(app).post(`/api/finance/expenses/${expenseId}/approval`)
      .set('Authorization', `Bearer ${treasurerToken}`).send({ decision: 'APPROVED' });
    expect(selfApproval.status).toBe(403);
    expect(selfApproval.body.code).toBe('SELF_APPROVAL_FORBIDDEN');
  });
});
