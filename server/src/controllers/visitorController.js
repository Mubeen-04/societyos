import crypto from 'crypto';
import { Visitor } from '../models/Visitor.js';
import { Apartment } from '../models/Apartment.js';
import { VISITOR_APPROVAL_STATUS, VISITOR_ENTRY_STATUS, ROLES } from '../constants/index.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

// Generate unique 6-character alphanumeric pass code
const generatePassCode = () => {
  return 'VP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Resident Pre-Approves a Visitor
export const preApproveVisitor = async (req, res, next) => {
  try {
    const { visitorName, visitorPhone, purpose, vehicleNumber, visitorCount, validUntil } = req.body;

    const apartmentId = req.user.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: 'You must be associated with an apartment to generate a visitor pass.'
      });
    }

    const passCode = generatePassCode();
    const expiry = validUntil ? new Date(validUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

    const visitor = await Visitor.create({
      societyId: req.societyId,
      passCode,
      qrCodeData: JSON.stringify({ passCode, societyId: req.societyId }),
      visitorName,
      visitorPhone,
      purpose: purpose || 'GUEST',
      residentId: req.user._id,
      apartmentId,
      vehicleNumber: vehicleNumber || '',
      visitorCount: visitorCount || 1,
      passType: 'PRE_APPROVED',
      approvalStatus: VISITOR_APPROVAL_STATUS.APPROVED,
      entryStatus: VISITOR_ENTRY_STATUS.WAITING,
      validFrom: new Date(),
      validUntil: expiry,
      approvedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Visitor pass created successfully.',
      data: visitor
    });
  } catch (error) {
    next(error);
  }
};

// Security Guard registers a Walk-in Visitor (Triggers Real-Time Resident Approval Request)
export const registerWalkIn = async (req, res, next) => {
  try {
    const { visitorName, visitorPhone, purpose, vehicleNumber, visitorCount, unitNumber, apartmentId } = req.body;

    let targetApartment;
    if (apartmentId) {
      targetApartment = await Apartment.findOne({ _id: apartmentId, societyId: req.societyId }).populate('ownerId tenantId');
    } else if (unitNumber) {
      targetApartment = await Apartment.findOne({
        unitNumber: unitNumber.trim().toUpperCase(),
        societyId: req.societyId
      }).populate('ownerId tenantId');
    }

    if (!targetApartment) {
      return res.status(404).json({
        success: false,
        message: `Apartment '${unitNumber || apartmentId}' was not found in this society.`,
        code: 'APARTMENT_NOT_FOUND'
      });
    }

    const resident = targetApartment.tenantId || targetApartment.ownerId;
    if (!resident) {
      return res.status(400).json({
        success: false,
        message: 'No resident is currently registered for this apartment to grant approval.',
        code: 'NO_RESIDENT_REGISTERED'
      });
    }

    const passCode = generatePassCode();
    const expiry = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours for walk-in

    const visitor = await Visitor.create({
      societyId: req.societyId,
      passCode,
      qrCodeData: JSON.stringify({ passCode, societyId: req.societyId }),
      visitorName,
      visitorPhone,
      purpose: purpose || 'DELIVERY',
      residentId: resident._id,
      apartmentId: targetApartment._id,
      vehicleNumber: vehicleNumber || '',
      visitorCount: visitorCount || 1,
      passType: 'WALK_IN',
      approvalStatus: VISITOR_APPROVAL_STATUS.PENDING,
      entryStatus: VISITOR_ENTRY_STATUS.WAITING,
      validFrom: new Date(),
      validUntil: expiry,
      guardInId: req.user._id
    });

    // Send in-app notification to resident
    await createNotification({
      societyId: req.societyId,
      recipientId: resident._id,
      type: 'VISITOR_REQUEST',
      title: 'Visitor at Gate Waiting for Approval',
      message: `${visitorName} (${purpose}) is at the security gate for unit ${targetApartment.unitNumber}.`,
      link: '/visitors',
      metadata: { visitorId: visitor._id, passCode: visitor.passCode }
    });

    res.status(201).json({
      success: true,
      message: 'Walk-in recorded and approval request logged for resident.',
      data: visitor
    });
  } catch (error) {
    next(error);
  }
};

// Resident Approves or Rejects Walk-in Visitor
export const handleVisitorDecision = async (req, res, next) => {
  try {
    const { decision, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'
    const visitor = await Visitor.findOne({ _id: req.params.id, societyId: req.societyId })
      .populate('apartmentId', 'unitNumber')
      .populate('residentId', 'name phone');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.approvalStatus !== VISITOR_APPROVAL_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `This visitor request has already been ${visitor.approvalStatus.toLowerCase()}.`
      });
    }

    if (decision === 'APPROVED') {
      visitor.approvalStatus = VISITOR_APPROVAL_STATUS.APPROVED;
      visitor.approvedBy = req.user._id;
    } else {
      visitor.approvalStatus = VISITOR_APPROVAL_STATUS.REJECTED;
      visitor.rejectionReason = rejectionReason || 'Declined by resident';
    }

    await visitor.save();

    res.json({
      success: true,
      message: `Visitor request has been ${visitor.approvalStatus}.`,
      data: visitor
    });
  } catch (error) {
    next(error);
  }
};

// Verify Visitor Pass (Pass Code or QR)
export const verifyPass = async (req, res, next) => {
  try {
    const { passCode } = req.body;

    if (!passCode) {
      return res.status(400).json({ success: false, message: 'Pass code is required' });
    }

    const cleanCode = passCode.trim().toUpperCase();
    const visitor = await Visitor.findOne({
      passCode: cleanCode,
      societyId: req.societyId
    })
      .populate('residentId', 'name phone')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      });

    if (!visitor) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Invalid visitor pass code.',
        code: 'PASS_NOT_FOUND'
      });
    }

    // Check expiration
    if (new Date() > new Date(visitor.validUntil)) {
      visitor.approvalStatus = VISITOR_APPROVAL_STATUS.EXPIRED;
      await visitor.save();
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Visitor pass has expired.',
        code: 'PASS_EXPIRED'
      });
    }

    // Check duplicate entry
    if (visitor.entryStatus === VISITOR_ENTRY_STATUS.INSIDE) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Visitor is already recorded as inside the society since ${new Date(visitor.actualEntryTime).toLocaleTimeString()}.`,
        code: 'ALREADY_INSIDE'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: visitor
    });
  } catch (error) {
    next(error);
  }
};

// Security Guard checks in visitor (Entry)
export const checkInVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findOne({ _id: req.params.id, societyId: req.societyId })
      .populate('apartmentId', 'unitNumber');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.approvalStatus !== VISITOR_APPROVAL_STATUS.APPROVED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check in an unapproved visitor.'
      });
    }

    if (visitor.entryStatus === VISITOR_ENTRY_STATUS.INSIDE) {
      return res.status(400).json({
        success: false,
        message: 'Visitor is already marked inside.'
      });
    }

    visitor.entryStatus = VISITOR_ENTRY_STATUS.INSIDE;
    visitor.actualEntryTime = new Date();
    visitor.guardInId = req.user._id;

    await visitor.save();

    // Notify resident
    await createNotification({
      societyId: req.societyId,
      recipientId: visitor.residentId,
      type: 'VISITOR_CHECKED_IN',
      title: 'Visitor Entered Society',
      message: `${visitor.visitorName} has entered the premises at ${new Date().toLocaleTimeString()}.`,
      link: '/visitors'
    });

    res.json({ success: true, message: 'Visitor checked in successfully.', data: visitor });
  } catch (error) {
    next(error);
  }
};

// Security Guard checks out visitor (Exit)
export const checkOutVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findOne({ _id: req.params.id, societyId: req.societyId });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.entryStatus !== VISITOR_ENTRY_STATUS.INSIDE) {
      return res.status(400).json({
        success: false,
        message: 'Visitor is not currently marked as inside the society.'
      });
    }

    visitor.entryStatus = VISITOR_ENTRY_STATUS.EXITED;
    visitor.actualExitTime = new Date();
    visitor.guardOutId = req.user._id;

    await visitor.save();

    res.json({ success: true, message: 'Visitor exit recorded successfully.', data: visitor });
  } catch (error) {
    next(error);
  }
};

// Get active visitors inside society
export const getActiveVisitors = async (req, res, next) => {
  try {
    const visitors = await Visitor.find({
      societyId: req.societyId,
      entryStatus: VISITOR_ENTRY_STATUS.INSIDE
    })
      .populate('residentId', 'name phone')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .sort({ actualEntryTime: -1 });

    res.json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    next(error);
  }
};

// Get visitor log / history
export const getVisitors = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20, entryStatus } = req.query;
    const query = { societyId: req.societyId };

    if (req.user.role === ROLES.RESIDENT) {
      query.residentId = req.user._id;
    }

    if (status) query.approvalStatus = status;
    if (entryStatus) query.entryStatus = entryStatus;
    if (search) {
      query.$or = [
        { visitorName: { $regex: search, $options: 'i' } },
        { visitorPhone: { $regex: search, $options: 'i' } },
        { passCode: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Visitor.countDocuments(query);

    const visitors = await Visitor.find(query)
      .populate('residentId', 'name phone')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: visitors,
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
