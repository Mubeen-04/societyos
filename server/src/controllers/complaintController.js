import { Complaint } from '../models/Complaint.js';
import { User } from '../models/User.js';
import { COMPLAINT_STATUSES, ROLES } from '../constants/index.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

// Create a new complaint
export const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority, apartmentId, attachments } = req.body;

    const assignedApartmentId = apartmentId || req.user.apartmentId;
    if (!assignedApartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Apartment ID is required to file a complaint.',
        code: 'APARTMENT_REQUIRED'
      });
    }

    const count = await Complaint.countDocuments({ societyId: req.societyId });
    const ticketNumber = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const timelineEntry = {
      status: COMPLAINT_STATUSES.OPEN,
      action: 'Complaint Registered',
      actorId: req.user._id,
      actorName: req.user.name,
      notes: 'Initial issue submitted by resident',
      timestamp: new Date()
    };

    const complaint = await Complaint.create({
      societyId: req.societyId,
      ticketNumber,
      title,
      description,
      category,
      priority: priority || 'MEDIUM',
      apartmentId: assignedApartmentId,
      createdBy: req.user._id,
      attachments: attachments || [],
      timeline: [timelineEntry]
    });

    await logAudit({
      req,
      action: 'CREATE_COMPLAINT',
      entity: 'Complaint',
      entityId: complaint._id,
      newState: { ticketNumber, title, category, priority }
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// Get complaints with filters, search, and pagination
export const getComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, search, page = 1, limit = 20 } = req.query;
    const query = { societyId: req.societyId };

    // If resident, only show their complaints
    if (req.user.role === ROLES.RESIDENT) {
      query.createdBy = req.user._id;
    }

    // If vendor, only show complaints assigned to them
    if (req.user.role === ROLES.VENDOR) {
      query.assignedVendorId = req.user._id;
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Complaint.countDocuments(query);

    const complaints = await Complaint.find(query)
      .populate('createdBy', 'name email phone avatarUrl')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .populate('assignedVendorId', 'companyName category contactPerson phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: complaints,
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

// Get single complaint with full timeline
export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      societyId: req.societyId
    })
      .populate('createdBy', 'name email phone avatarUrl')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .populate('assignedVendorId', 'companyName category contactPerson phone');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Authorization check for residents
    if (req.user.role === ROLES.RESIDENT && complaint.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this ticket' });
    }

    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

// Update complaint status (State machine transition)
export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, societyId: req.societyId });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Role-based transition validation
    if (req.user.role === ROLES.RESIDENT) {
      if (status !== COMPLAINT_STATUSES.CLOSED && status !== COMPLAINT_STATUSES.REOPENED) {
        return res.status(403).json({
          success: false,
          message: 'Residents can only Confirm (Close) or Reopen resolved complaints.'
        });
      }
    }

    const previousStatus = complaint.status;
    complaint.status = status;

    if (status === COMPLAINT_STATUSES.RESOLVED) {
      complaint.resolvedAt = new Date();
    } else if (status === COMPLAINT_STATUSES.CLOSED) {
      complaint.closedAt = new Date();
    }

    // Append to immutable timeline
    complaint.timeline.push({
      status,
      action: `Status transitioned to ${status}`,
      actorId: req.user._id,
      actorName: req.user.name,
      notes: notes || `Changed from ${previousStatus} to ${status}`,
      timestamp: new Date()
    });

    await complaint.save();

    await logAudit({
      req,
      action: 'UPDATE_COMPLAINT_STATUS',
      entity: 'Complaint',
      entityId: complaint._id,
      previousState: { status: previousStatus },
      newState: { status, notes }
    });

    // Notify ticket creator
    await createNotification({
      societyId: req.societyId,
      recipientId: complaint.createdBy,
      type: 'COMPLAINT_UPDATE',
      title: `Complaint #${complaint.ticketNumber} Updated`,
      message: `Your complaint has been marked as ${status}. ${notes ? `Note: ${notes}` : ''}`,
      link: `/complaints/${complaint._id}`
    });

    res.json({ success: true, message: `Status updated to ${status}`, data: complaint });
  } catch (error) {
    next(error);
  }
};

// Assign vendor / staff to complaint
export const assignComplaint = async (req, res, next) => {
  try {
    const { vendorId, staffId, notes } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, societyId: req.societyId });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.assignedVendorId = vendorId || null;
    complaint.assignedStaffId = staffId || null;
    complaint.assignedAt = new Date();
    complaint.status = COMPLAINT_STATUSES.ASSIGNED;

    complaint.timeline.push({
      status: COMPLAINT_STATUSES.ASSIGNED,
      action: 'Assigned to Service Partner',
      actorId: req.user._id,
      actorName: req.user.name,
      notes: notes || 'Service specialist assigned by management',
      timestamp: new Date()
    });

    await complaint.save();

    await logAudit({
      req,
      action: 'ASSIGN_COMPLAINT',
      entity: 'Complaint',
      entityId: complaint._id,
      newState: { assignedVendorId: vendorId, assignedStaffId: staffId }
    });

    // Notify resident
    await createNotification({
      societyId: req.societyId,
      recipientId: complaint.createdBy,
      type: 'COMPLAINT_UPDATE',
      title: `Specialist Assigned: Ticket #${complaint.ticketNumber}`,
      message: 'Management has assigned a specialist to resolve your complaint.',
      link: `/complaints/${complaint._id}`
    });

    res.json({ success: true, message: 'Assigned successfully', data: complaint });
  } catch (error) {
    next(error);
  }
};

// Resident feedback rating
export const submitFeedback = async (req, res, next) => {
  try {
    const { satisfactionRating, feedbackComments } = req.body;
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      societyId: req.societyId,
      createdBy: req.user._id
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found or unauthorized' });
    }

    complaint.satisfactionRating = satisfactionRating;
    complaint.feedbackComments = feedbackComments || '';
    complaint.status = COMPLAINT_STATUSES.CLOSED;
    complaint.closedAt = new Date();

    complaint.timeline.push({
      status: COMPLAINT_STATUSES.CLOSED,
      action: 'Resident Confirmed & Closed',
      actorId: req.user._id,
      actorName: req.user.name,
      notes: `Rating: ${satisfactionRating}/5 stars. Feedback: ${feedbackComments || 'No comments'}`,
      timestamp: new Date()
    });

    await complaint.save();

    res.json({ success: true, message: 'Thank you for your feedback! Ticket closed.', data: complaint });
  } catch (error) {
    next(error);
  }
};
