import crypto from 'crypto';
import { MaintenanceInvoice } from '../models/MaintenanceInvoice.js';
import { Payment } from '../models/Payment.js';
import { Apartment } from '../models/Apartment.js';
import { Society } from '../models/Society.js';
import { User } from '../models/User.js';
import { FinancialTransaction } from '../models/FinancialTransaction.js';
import { StripeWebhookEvent } from '../models/StripeWebhookEvent.js';
import { INVOICE_STATUS, MAINTENANCE_PAYER_ROLES, PAYMENT_METHODS, ROLES } from '../constants/index.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';
import { createMaintenanceCheckoutSession, verifyStripeSignature } from '../services/stripeService.js';

const personalInvoiceScope = (user) => {
  const apartmentId = user.apartmentId?._id || user.apartmentId;
  // Governance users can also be residents. Require both links when an
  // apartment is assigned so an old or mismatched residentId cannot widen access.
  return apartmentId
    ? { apartmentId, residentId: user._id }
    : { residentId: user._id };
};

// Batch generate monthly invoices for all occupied apartments (Admin only)
export const generateMonthlyInvoices = async (req, res, next) => {
  try {
    const { billingMonth, dueDate, baseMaintenance = 4000, waterCharges = 300, parkingCharges = 500, lateFee = 0, discount = 0, apartmentIds } = req.body;
    const amounts = [baseMaintenance, waterCharges, parkingCharges, lateFee, discount].map(Number);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingMonth || '') || !dueDate || Number.isNaN(new Date(dueDate).getTime()) || amounts.some((value) => !Number.isFinite(value) || value < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid billing month, due date, and non-negative bill amounts.'
      });
    }

    const apartmentQuery = {
      societyId: req.societyId,
      status: 'OCCUPIED'
    };
    if (Array.isArray(apartmentIds) && apartmentIds.length) apartmentQuery._id = { $in: apartmentIds };
    const apartments = await Apartment.find(apartmentQuery).populate('ownerId tenantId');
    if (Array.isArray(apartmentIds) && apartments.length !== new Set(apartmentIds.map(String)).size) {
      return res.status(400).json({ success: false, message: 'Every selected apartment must be occupied and belong to this society.' });
    }

    const createdInvoices = [];
    const skippedUnits = [];

    for (const apt of apartments) {
      const resident = apt.tenantId || apt.ownerId;
      if (!resident) {
        skippedUnits.push(apt.unitNumber);
        continue;
      }

      // Check if invoice already exists for this unit in this month
      const existing = await MaintenanceInvoice.findOne({
        societyId: req.societyId,
        billingMonth,
        apartmentId: apt._id
      });

      if (existing) {
        skippedUnits.push(apt.unitNumber);
        continue;
      }

      const invoiceNumber = `INV-${billingMonth.replace('-', '')}-${apt.unitNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
      const items = [
        { title: 'Base Maintenance & Facilities', amount: Number(baseMaintenance), type: 'MAINTENANCE' },
        { title: 'Municipal & Borewell Water Charges', amount: Number(waterCharges), type: 'WATER' },
        { title: 'Dedicated Parking Space Levy', amount: Number(parkingCharges), type: 'PARKING' }
      ];

      const totalAmount = amounts[0] + amounts[1] + amounts[2];
      const payableAmount = totalAmount + amounts[3] - amounts[4];
      if (payableAmount <= 0) return res.status(400).json({ success: false, message: 'Discount must be less than the total billed amount.' });

      let invoice;
      try { invoice = await MaintenanceInvoice.create({
        societyId: req.societyId,
        invoiceNumber,
        apartmentId: apt._id,
        residentId: resident._id,
        billingMonth,
        dueDate: new Date(dueDate),
        items,
        totalAmount,
        lateFee: amounts[3],
        discount: amounts[4],
        payableAmount,
        amountPaid: 0,
        status: INVOICE_STATUS.PENDING
      }); } catch (error) {
        if (error.code === 11000) { skippedUnits.push(apt.unitNumber); continue; }
        throw error;
      }

      createdInvoices.push(invoice);

      // In-app notification to resident
      await createNotification({
        societyId: req.societyId,
        recipientId: resident._id,
        type: 'PAYMENT_DUE',
        title: `Maintenance Bill Generated for ${billingMonth}`,
        message: `Your monthly maintenance invoice #${invoiceNumber} for ₹${totalAmount.toLocaleString()} is now available.`,
        link: `/bills/${invoice._id}`
      });
    }

    await logAudit({
      req,
      action: 'GENERATE_MONTHLY_INVOICES',
      entity: 'MaintenanceInvoice',
      entityId: billingMonth,
      newState: { createdCount: createdInvoices.length, skippedCount: skippedUnits.length }
    });

    res.status(201).json({
      success: true,
      message: `Generated ${createdInvoices.length} invoices for ${billingMonth}. (${skippedUnits.length} units skipped).`,
      data: { createdCount: createdInvoices.length, skippedCount: skippedUnits.length }
    });
  } catch (error) {
    next(error);
  }
};

// Get invoices (Resident gets their own; authorized society roles get all)
export const getInvoices = async (req, res, next) => {
  try {
    const { status, billingMonth, page = 1, limit = 20 } = req.query;
    const query = { societyId: req.societyId };

    if (MAINTENANCE_PAYER_ROLES.includes(req.user.role)) Object.assign(query, personalInvoiceScope(req.user));

    if (status) query.status = status;
    if (billingMonth) query.billingMonth = billingMonth;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await MaintenanceInvoice.countDocuments(query);

    const invoices = await MaintenanceInvoice.find(query)
      .populate('residentId', 'name email phone')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single invoice
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoiceQuery = {
      _id: req.params.id,
      societyId: req.societyId
    };
    if (MAINTENANCE_PAYER_ROLES.includes(req.user.role)) Object.assign(invoiceQuery, personalInvoiceScope(req.user));
    const invoice = await MaintenanceInvoice.findOne(invoiceQuery)
      .populate('residentId', 'name email phone')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .populate('paymentId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// Process mock payment (Server authoritatively calculates amount from invoice!)
export const processPayment = async (req, res, next) => {
  try {
    const { invoiceId, paymentMethod = PAYMENT_METHODS.ONLINE_MOCK } = req.body;

    const invoice = await MaintenanceInvoice.findOne({
      _id: invoiceId,
      societyId: req.societyId
    }).populate('apartmentId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === INVOICE_STATUS.PAID) {
      return res.status(400).json({ success: false, message: 'This invoice is already settled.' });
    }

    // Amount is taken directly from the database invoice, never trusted from the client payload!
    const payableAmount = invoice.payableAmount;
    const paymentId = 'PAY-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionRef = 'TXN-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const receiptNumber = 'REC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const payment = await Payment.create({
      societyId: req.societyId,
      paymentId,
      invoiceId: invoice._id,
      userId: req.user._id,
      apartmentId: invoice.apartmentId._id,
      amount: payableAmount,
      paymentMethod,
      transactionRef,
      status: 'SUCCESS',
      receiptNumber,
      paymentGatewayResponse: {
        gateway: 'MockPaymentGateway-v1',
        authorizedAt: new Date().toISOString(),
        authCode: 'AUTH-' + Math.floor(100000 + Math.random() * 900000)
      }
    });

    // Update invoice state
    invoice.status = INVOICE_STATUS.PAID;
    invoice.paidAt = new Date();
    invoice.paymentId = payment._id;
    await invoice.save();

    await logAudit({
      req,
      action: 'PAYMENT_RECEIVED',
      entity: 'Payment',
      entityId: payment._id,
      newState: { invoiceNumber: invoice.invoiceNumber, amount: payableAmount, receiptNumber }
    });

    // Notify resident
    await createNotification({
      societyId: req.societyId,
      recipientId: req.user._id,
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Receipt Available',
      message: `Payment of ₹${payableAmount.toLocaleString()} for invoice #${invoice.invoiceNumber} successful. Receipt #${receiptNumber}.`,
      link: `/bills/${invoice._id}`
    });

    res.status(201).json({
      success: true,
      message: 'Payment completed successfully!',
      data: {
        payment,
        invoice
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get payment receipt
export const getReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      societyId: req.societyId
    })
      .populate('userId', 'name email phone')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .populate('invoiceId');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// Get payment history
export const getPayments = async (req, res, next) => {
  try {
    const query = { societyId: req.societyId };
    if (req.user.role === ROLES.RESIDENT) {
      query.userId = req.user._id;
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email')
      .populate('invoiceId', 'invoiceNumber billingMonth')
      .populate('apartmentId', 'unitNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
