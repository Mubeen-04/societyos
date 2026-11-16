import { User } from '../models/User.js';
import { Apartment } from '../models/Apartment.js';
import { Complaint } from '../models/Complaint.js';
import { Visitor } from '../models/Visitor.js';
import { MaintenanceInvoice } from '../models/MaintenanceInvoice.js';
import { Payment } from '../models/Payment.js';
import { FinancialTransaction } from '../models/FinancialTransaction.js';
import { AmenityBooking } from '../models/AmenityBooking.js';
import { ROLES, COMPLAINT_STATUSES, VISITOR_ENTRY_STATUS, INVOICE_STATUS } from '../constants/index.js';

// Overview analytics for Admin and governance roles
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const societyId = req.societyId;

    // Counts
    const totalResidents = await User.countDocuments({ societyId, role: ROLES.RESIDENT });
    const totalApartments = await Apartment.countDocuments({ societyId });
    const occupiedApartments = await Apartment.countDocuments({ societyId, status: 'OCCUPIED' });
    const occupancyRate = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0;

    // Complaints
    const openComplaints = await Complaint.countDocuments({
      societyId,
      status: { $in: [COMPLAINT_STATUSES.OPEN, COMPLAINT_STATUSES.ASSIGNED, COMPLAINT_STATUSES.IN_PROGRESS] }
    });
    const resolvedComplaints = await Complaint.countDocuments({
      societyId,
      status: { $in: [COMPLAINT_STATUSES.RESOLVED, COMPLAINT_STATUSES.CLOSED] }
    });
    const totalComplaints = openComplaints + resolvedComplaints;
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

    // Complaints by Category
    const complaintsByCategory = await Complaint.aggregate([
      { $match: { societyId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Financials
    const allInvoices = await MaintenanceInvoice.find({ societyId });
    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;

    allInvoices.forEach(inv => {
      const billed = Number(inv.payableAmount || 0);
      const collected = inv.status === INVOICE_STATUS.PAID && !(inv.amountPaid > 0)
        ? billed
        : Number(inv.amountPaid || 0);
      totalBilled += billed;
      totalCollected += collected;
      totalPending += Math.max(0, billed - collected);
    });

    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    // Monthly Collection Chart (Last 6 months)
    const monthlyCollections = await FinancialTransaction.aggregate([
      { $match: { societyId, type: 'CREDIT', status: 'COMPLETED', createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);

    // Visitors Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const visitorsToday = await Visitor.countDocuments({
      societyId,
      createdAt: { $gte: startOfToday }
    });

    const currentlyInside = await Visitor.countDocuments({
      societyId,
      entryStatus: VISITOR_ENTRY_STATUS.INSIDE
    });

    res.json({
      success: true,
      data: {
        totalResidents,
        totalApartments,
        occupiedApartments,
        occupancyRate,
        openComplaints,
        resolvedComplaints,
        resolutionRate,
        complaintsByCategory: complaintsByCategory.map(c => ({ category: c._id, count: c.count })),
        financials: {
          totalBilled,
          totalCollected,
          totalPending,
          collectionRate
        },
        monthlyCollections: monthlyCollections.map(m => ({ month: m._id, amount: m.amount })),
        visitors: {
          visitorsToday,
          currentlyInside
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Resident dashboard summary
export const getResidentSummary = async (req, res, next) => {
  try {
    const societyId = req.societyId;
    const userId = req.user._id;

    // Pending Maintenance Dues
    const pendingInvoices = await MaintenanceInvoice.find({
      societyId,
      residentId: userId,
      status: { $in: [INVOICE_STATUS.PENDING, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.PARTIAL, INVOICE_STATUS.PARTIALLY_PAID] }
    });
    const maintenanceDue = pendingInvoices.reduce((acc, curr) => {
      const collected = curr.status === INVOICE_STATUS.PAID && !(curr.amountPaid > 0) ? curr.payableAmount : (curr.amountPaid || 0);
      return acc + Math.max(0, (curr.payableAmount || 0) - collected);
    }, 0);

    // Open Complaints
    const openComplaintsCount = await Complaint.countDocuments({
      societyId,
      createdBy: userId,
      status: { $in: [COMPLAINT_STATUSES.OPEN, COMPLAINT_STATUSES.ASSIGNED, COMPLAINT_STATUSES.IN_PROGRESS] }
    });

    // Upcoming Amenity Bookings
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingBookingsCount = await AmenityBooking.countDocuments({
      societyId,
      userId,
      bookingDate: { $gte: todayStr },
      status: 'CONFIRMED'
    });

    // Expected Visitors
    const expectedVisitorsCount = await Visitor.countDocuments({
      societyId,
      residentId: userId,
      entryStatus: VISITOR_ENTRY_STATUS.WAITING,
      approvalStatus: { $in: ['PENDING', 'APPROVED'] }
    });

    res.json({
      success: true,
      data: {
        maintenanceDue,
        openComplaintsCount,
        upcomingBookingsCount,
        expectedVisitorsCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Security Gate Terminal stats
export const getSecurityStats = async (req, res, next) => {
  try {
    const societyId = req.societyId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const expectedVisitors = await Visitor.countDocuments({
      societyId,
      entryStatus: VISITOR_ENTRY_STATUS.WAITING,
      approvalStatus: 'APPROVED'
    });

    const currentlyInside = await Visitor.countDocuments({
      societyId,
      entryStatus: VISITOR_ENTRY_STATUS.INSIDE
    });

    const pendingApprovals = await Visitor.countDocuments({
      societyId,
      approvalStatus: 'PENDING'
    });

    const todayEntries = await Visitor.countDocuments({
      societyId,
      actualEntryTime: { $gte: startOfToday }
    });

    const todayExits = await Visitor.countDocuments({
      societyId,
      actualExitTime: { $gte: startOfToday }
    });

    res.json({
      success: true,
      data: {
        expectedVisitors,
        currentlyInside,
        pendingApprovals,
        todayEntries,
        todayExits
      }
    });
  } catch (error) {
    next(error);
  }
};
