import crypto from 'crypto';
import mongoose from 'mongoose';
import { Apartment } from '../models/Apartment.js';
import { CommitteeProposal } from '../models/CommitteeProposal.js';
import { Expense } from '../models/Expense.js';
import { ExpenseApproval } from '../models/ExpenseApproval.js';
import { FinanceCategory } from '../models/FinanceCategory.js';
import { FinancialTransaction } from '../models/FinancialTransaction.js';
import { MaintenanceInvoice } from '../models/MaintenanceInvoice.js';
import { Payment } from '../models/Payment.js';
import { Society } from '../models/Society.js';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { ROLES, INVOICE_STATUS } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { getRequiredExpenseApprovals } from '../services/financePolicy.js';

const attachmentUrls = (files = []) => files.map((file) => `/uploads/${file.filename}`);
const validAmount = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const payableStatuses = [
  INVOICE_STATUS.PENDING,
  INVOICE_STATUS.OVERDUE,
  INVOICE_STATUS.PARTIAL,
  INVOICE_STATUS.PARTIALLY_PAID
];
const notifyRoles = async (societyId, roles, payload) => {
  const users = await User.find({ societyId, role: { $in: roles }, isActive: true }).select('_id');
  await Promise.all(users.map((user) => createNotification({ societyId, recipientId: user._id, ...payload })));
};

export const getFinanceCategories = async (req, res, next) => {
  try {
    const categories = await FinanceCategory.find({ societyId: req.societyId, isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

export const getFinanceOverview = async (req, res, next) => {
  try {
    const societyId = new mongoose.Types.ObjectId(req.societyId);
    const [billTotals, expenseTotals, monthlyCollections, monthlyExpenses, byCategory, pendingApprovals, recentTransactions, recentExpenses, overdueBills] = await Promise.all([
      MaintenanceInvoice.aggregate([{ $match: { societyId } }, { $group: { _id: null, billed: { $sum: '$payableAmount' }, collected: { $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, '$payableAmount', { $ifNull: ['$amountPaid', 0] }] } }, outstanding: { $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, 0, { $max: [0, { $subtract: ['$payableAmount', { $ifNull: ['$amountPaid', 0] }] }] }] } }, overdue: { $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.OVERDUE] }, { $max: [0, { $subtract: ['$payableAmount', { $ifNull: ['$amountPaid', 0] }] }] }, 0] } } } }]),
      Expense.aggregate([{ $match: { societyId, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      FinancialTransaction.aggregate([{ $match: { societyId, direction: 'CREDIT', referenceType: 'MAINTENANCE_PAYMENT' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' } } }, { $sort: { _id: 1 } }, { $limit: 6 }]),
      Expense.aggregate([{ $match: { societyId, status: 'PAID' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, amount: { $sum: '$amount' } } }, { $sort: { _id: 1 } }, { $limit: 6 }]),
      Expense.aggregate([{ $match: { societyId, status: 'PAID' } }, { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
      ExpenseApproval.countDocuments({ societyId, status: 'PENDING', requiredRole: req.user.role }),
      FinancialTransaction.find({ societyId }).sort({ createdAt: -1 }).limit(8).populate('paymentId', 'paymentId').populate('expenseId', 'title'),
      Expense.find({ societyId }).sort({ createdAt: -1 }).limit(8).populate('vendorId', 'name'),
      MaintenanceInvoice.find({ societyId, status: INVOICE_STATUS.OVERDUE }).sort({ dueDate: 1 }).limit(8).populate('residentId', 'name').populate('apartmentId', 'unitNumber')
    ]);
    const bills = billTotals[0] || { billed: 0, collected: 0, outstanding: 0, overdue: 0 };
    const collectionRate = bills.billed > 0 ? Math.round((bills.collected / bills.billed) * 10000) / 100 : 0;
    const expenseMonthMap = Object.fromEntries(monthlyExpenses.map((entry) => [entry._id, entry.amount]));
    const cashFlow = bills.collected - (expenseTotals[0]?.total || 0);
    res.json({ success: true, data: {
      financials: { ...bills, monthlyExpenses: expenseTotals[0]?.total || 0, netCashFlow: cashFlow, collectionRate, pendingApprovals },
      monthlyCollections: monthlyCollections.map((entry) => ({ month: entry._id, amount: entry.amount })),
      monthlyExpenses: monthlyExpenses.map((entry) => ({ month: entry._id, amount: entry.amount })),
      incomeVsExpense: monthlyCollections.map((entry) => ({ month: entry._id, income: entry.amount, expense: expenseMonthMap[entry._id] || 0 })),
      expenseByCategory: byCategory, recentTransactions, recentExpenses, overdueBills
    } });
  } catch (error) { next(error); }
};

export const getCollections = async (req, res, next) => {
  try {
    const query = { societyId: req.societyId };
    const { billingMonth, status } = req.query;
    if (billingMonth) query.billingMonth = billingMonth;
    if (status) query.status = status;
    const [totals, bills] = await Promise.all([
      MaintenanceInvoice.aggregate([{ $match: query }, { $group: { _id: null, billed: { $sum: '$payableAmount' }, collected: { $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, '$payableAmount', { $ifNull: ['$amountPaid', 0] }] } }, overdue: { $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.OVERDUE] }, { $max: [0, { $subtract: ['$payableAmount', { $ifNull: ['$amountPaid', 0] }] }] }, 0] } } } }]),
      MaintenanceInvoice.find(query).populate('residentId', 'name email').populate('apartmentId', 'unitNumber').sort({ dueDate: 1 }).limit(500)
    ]);
    const value = totals[0] || { billed: 0, collected: 0, overdue: 0 };
    res.json({ success: true, data: { ...value, outstanding: Math.max(0, value.billed - value.collected), collectionRate: value.billed > 0 ? Math.round((value.collected / value.billed) * 10000) / 100 : 0, bills } });
  } catch (error) { next(error); }
};

export const getExpenses = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 30 } = req.query;
    const query = { societyId: req.societyId, ...(status ? { status } : {}), ...(category ? { category } : {}) };
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).populate('createdBy', 'name role').populate('vendorId', 'name category').populate('paymentId').populate('governanceProposalId', 'title status').sort({ createdAt: -1 }).skip((Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit) || 30)).limit(Math.min(100, Number(limit) || 30));
    const approvals = expenses.length ? await ExpenseApproval.find({ societyId: req.societyId, expenseId: { $in: expenses.map((expense) => expense._id) } }).populate('decidedBy', 'name role') : [];
    const approvalMap = approvals.reduce((map, approval) => { (map[approval.expenseId.toString()] ||= []).push(approval); return map; }, {});
    res.json({ success: true, data: expenses.map((expense) => ({ ...expense.toObject(), approvals: approvalMap[expense._id.toString()] || [] })), pagination: { total, page: Number(page), limit: Math.min(100, Number(limit) || 30) } });
  } catch (error) { next(error); }
};

export const createExpense = async (req, res, next) => {
  try {
    const { title, description = '', category, amount, vendorId, vendorName = '', invoiceNumber = '', invoiceDate, governanceProposalId } = req.body;
    if (!title?.trim() || !validAmount(amount) || !category || (invoiceDate && Number.isNaN(new Date(invoiceDate).getTime()))) return res.status(400).json({ success: false, message: 'Provide a title, category, positive amount, and valid optional invoice date.' });
    const [categoryRecord, vendor] = await Promise.all([
      FinanceCategory.findOne({ societyId: req.societyId, name: category, isActive: true }),
      vendorId ? Vendor.findOne({ _id: vendorId, societyId: req.societyId, status: 'ACTIVE' }) : null
    ]);
    if (!categoryRecord) return res.status(400).json({ success: false, message: 'Choose an active finance category for this society.' });
    if (vendorId && !vendor) return res.status(400).json({ success: false, message: 'Choose an active vendor in this society.' });
    const expense = await Expense.create({ societyId: req.societyId, title: title.trim(), description, category, amount: Number(amount), vendorId: vendor?._id || null, vendorName: vendor?.name || vendorName, invoiceNumber, invoiceDate: invoiceDate ? new Date(invoiceDate) : null, attachments: attachmentUrls(req.files), createdBy: req.user._id, governanceProposalId: governanceProposalId || null });
    await logAudit({ req, action: 'EXPENSE_CREATED', entity: 'Expense', entityId: expense._id, newState: { title: expense.title, category, amount: expense.amount } });
    res.status(201).json({ success: true, data: expense });
  } catch (error) { next(error); }
};

export const submitExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    if (expense.status !== 'DRAFT' || expense.createdBy.toString() !== req.user._id.toString()) return res.status(409).json({ success: false, message: 'Only the expense creator can submit a draft expense.' });
    const society = await Society.findById(req.societyId).select('settings.financePolicy');
    const { approvals, governanceReviewRequired } = getRequiredExpenseApprovals(expense.amount, society?.settings?.financePolicy);
    if (governanceReviewRequired) {
      const approvedProposal = expense.governanceProposalId && await CommitteeProposal.findOne({ _id: expense.governanceProposalId, societyId: req.societyId, status: 'APPROVED', approvedAt: { $ne: null } });
      if (!approvedProposal) return res.status(400).json({ success: false, message: 'Expenses above the governance review threshold require a Chairman-confirmed approved committee proposal.', code: 'GOVERNANCE_REVIEW_REQUIRED' });
    }
    await ExpenseApproval.deleteMany({ expenseId: expense._id, societyId: req.societyId });
    await ExpenseApproval.insertMany(approvals.map((requiredRole) => ({ societyId: req.societyId, expenseId: expense._id, requiredRole, status: 'PENDING' })));
    expense.status = 'UNDER_REVIEW';
    expense.submittedAt = new Date();
    await expense.save();
    await notifyRoles(req.societyId, approvals, { type: 'EXPENSE_UPDATE', title: 'Expense requires review', message: `${expense.title} requires ${approvals.join(' and ')} approval.`, link: '/finance/approvals', metadata: { expenseId: expense._id } });
    await logAudit({ req, action: 'EXPENSE_SUBMITTED', entity: 'Expense', entityId: expense._id, newState: { status: expense.status, requiredApprovals: approvals, governanceReviewRequired } });
    res.json({ success: true, data: expense });
  } catch (error) { next(error); }
};

export const decideExpenseApproval = async (req, res, next) => {
  try {
    const { decision, reason = '' } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision) || (decision === 'REJECTED' && !reason.trim())) return res.status(400).json({ success: false, message: 'Choose APPROVED or REJECTED and provide a reason when rejecting.' });
    const expense = await Expense.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!expense || expense.status !== 'UNDER_REVIEW') return res.status(404).json({ success: false, message: 'Expense is not awaiting approval.' });
    if (expense.createdBy.toString() === req.user._id.toString()) return res.status(403).json({ success: false, message: 'You cannot approve or reject an expense you created.', code: 'SELF_APPROVAL_FORBIDDEN' });
    const approval = await ExpenseApproval.findOneAndUpdate({ societyId: req.societyId, expenseId: expense._id, requiredRole: req.user.role, status: 'PENDING' }, { $set: { status: decision, decidedBy: req.user._id, reason: reason.trim(), decidedAt: new Date() } }, { new: true });
    if (!approval) return res.status(403).json({ success: false, message: 'No pending approval assigned to your role for this expense.' });
    if (decision === 'REJECTED') {
      const rejected = await Expense.findOneAndUpdate({ _id: expense._id, societyId: req.societyId, status: 'UNDER_REVIEW' }, { $set: { status: 'REJECTED', rejectionReason: reason.trim() } }, { new: true });
      if (!rejected) return res.status(409).json({ success: false, message: 'Expense approval state changed while your decision was being recorded.' });
      expense.status = rejected.status;
      expense.rejectionReason = rejected.rejectionReason;
    } else {
      const pending = await ExpenseApproval.exists({ societyId: req.societyId, expenseId: expense._id, status: 'PENDING' });
      if (!pending) {
        const approved = await Expense.findOneAndUpdate({ _id: expense._id, societyId: req.societyId, status: 'UNDER_REVIEW' }, { $set: { status: 'PAYMENT_PENDING', approvedAt: new Date() } }, { new: true });
        if (!approved) return res.status(409).json({ success: false, message: 'Expense approval state changed while your decision was being recorded.' });
        expense.status = approved.status;
        expense.approvedAt = approved.approvedAt;
      }
    }
    await logAudit({ req, action: decision === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED', entity: 'Expense', entityId: expense._id, previousState: { status: 'UNDER_REVIEW' }, newState: { status: expense.status, role: req.user.role, reason } });
    await createNotification({ societyId: req.societyId, recipientId: expense.createdBy, type: 'EXPENSE_UPDATE', title: decision === 'APPROVED' ? 'Expense approval recorded' : 'Expense rejected', message: `${expense.title}: ${decision.toLowerCase()}.${reason ? ` ${reason}` : ''}`, link: '/finance/expenses', metadata: { expenseId: expense._id } });
    res.json({ success: true, data: { expense, approval } });
  } catch (error) { next(error); }
};

export const recordExpensePayment = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, societyId: req.societyId, status: 'PAYMENT_PENDING' });
    if (!expense) return res.status(404).json({ success: false, message: 'Approved expense awaiting payment was not found.' });
    if (req.body.amount !== undefined && Number(req.body.amount) !== expense.amount) return res.status(400).json({ success: false, message: 'Payment amount must equal the approved expense amount.' });
    const method = req.body.paymentMethod;
    const allowedMethods = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'OTHER', 'CASH_OFFLINE'];
    if (!allowedMethods.includes(method)) return res.status(400).json({ success: false, message: 'Choose a supported manual payment method.' });
    const payment = await Payment.create({ societyId: req.societyId, paymentId: `PAY-${crypto.randomUUID()}`, expenseId: expense._id, amount: expense.amount, paymentMethod: method, provider: method === 'BANK_TRANSFER' ? 'BANK' : 'MANUAL', transactionRef: (req.body.referenceNumber || '').trim() || `REF-${crypto.randomUUID()}`, status: 'SUCCESS', paidAt: new Date(), recordedBy: req.user._id, receiptNumber: `REC-${crypto.randomUUID()}` });
    const paid = await Expense.findOneAndUpdate({ _id: expense._id, societyId: req.societyId, status: 'PAYMENT_PENDING', paymentId: null }, { $set: { status: 'PAID', paidAt: payment.paidAt, paymentId: payment._id } }, { new: true });
    if (!paid) { await Payment.deleteOne({ _id: payment._id }); return res.status(409).json({ success: false, message: 'Expense payment has already been recorded.' }); }
    const idempotencyKey = `PAYMENT:${payment._id}:SUCCESS`;
    await FinancialTransaction.updateOne({ idempotencyKey }, { $setOnInsert: { societyId: req.societyId, direction: 'DEBIT', amount: expense.amount, category: expense.category, description: expense.title, reference: payment.transactionRef, referenceType: 'EXPENSE_PAYMENT', expenseId: expense._id, paymentId: payment._id, createdBy: req.user._id, idempotencyKey } }, { upsert: true });
    await logAudit({ req, action: 'EXPENSE_PAID', entity: 'Expense', entityId: expense._id, newState: { status: 'PAID', paymentId: payment._id, amount: expense.amount }, idempotencyKey });
    await createNotification({ societyId: req.societyId, recipientId: expense.createdBy, type: 'EXPENSE_UPDATE', title: 'Expense payment recorded', message: `${expense.title} was marked paid.`, link: '/finance/expenses', metadata: { expenseId: expense._id } });
    res.status(201).json({ success: true, data: { expense: paid, payment } });
  } catch (error) { next(error); }
};

export const getTransactions = async (req, res, next) => {
  try {
    const societyId = new mongoose.Types.ObjectId(req.societyId);
    const { from, to, direction, category, page = 1, limit = 50 } = req.query;
    const match = { societyId };
    if (direction && ['CREDIT', 'DEBIT'].includes(direction)) match.direction = direction;
    if (category) match.category = category;
    if (from || to) match.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
    const size = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (Math.max(1, Number(page) || 1) - 1) * size;
    const data = await FinancialTransaction.aggregate([
      { $match: { societyId } }, { $sort: { createdAt: 1, _id: 1 } },
      {
        $setWindowFields: {
          sortBy: { createdAt: 1, _id: 1 },
          output: {
            balance: {
              $sum: { $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amount', { $multiply: ['$amount', -1] }] },
              window: { documents: ['unbounded', 'current'] }
            }
          }
        }
      },
      { $match: match }, { $sort: { createdAt: -1 } }, { $skip: offset }, { $limit: size },
      { $lookup: { from: 'payments', localField: 'paymentId', foreignField: '_id', as: 'payment' } },
      { $lookup: { from: 'expenses', localField: 'expenseId', foreignField: '_id', as: 'expense' } },
      { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } }, { $unwind: { path: '$expense', preserveNullAndEmptyArrays: true } }
    ]);
    const total = await FinancialTransaction.countDocuments(match);
    res.json({ success: true, data, pagination: { page: Number(page), limit: size, total } });
  } catch (error) { next(error); }
};

export const getFinanceReports = async (req, res, next) => {
  try {
    const societyId = new mongoose.Types.ObjectId(req.societyId);
    const [income, expense, collections, outstanding, monthly, categories] = await Promise.all([
      FinancialTransaction.aggregate([{ $match: { societyId, direction: 'CREDIT' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      FinancialTransaction.aggregate([{ $match: { societyId, direction: 'DEBIT' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      MaintenanceInvoice.aggregate([{ $match: { societyId } }, { $group: { _id: '$billingMonth', billed: { $sum: '$payableAmount' }, collected: { $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, '$payableAmount', { $ifNull: ['$amountPaid', 0] }] } } } }, { $sort: { _id: 1 } }]),
      MaintenanceInvoice.aggregate([{ $match: { societyId, status: { $in: payableStatuses } } }, { $group: { _id: '$billingMonth', balance: { $sum: { $max: [0, { $subtract: ['$payableAmount', { $ifNull: ['$amountPaid', 0] }] }] } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      FinancialTransaction.aggregate([{ $match: { societyId } }, { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, direction: '$direction' }, total: { $sum: '$amount' } } }, { $sort: { '_id.month': 1 } }]),
      Expense.aggregate([{ $match: { societyId, status: 'PAID' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }])
    ]);
    res.json({ success: true, data: { income, expense, collections, outstanding, monthly, expenseByCategory: categories } });
  } catch (error) { next(error); }
};
