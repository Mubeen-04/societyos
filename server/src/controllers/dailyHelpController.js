import { DailyHelp, DailyHelpLog, Apartment, User } from '../models/index.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditService.js';

// Helper to generate a unique pass code for daily help
const generateDailyHelpPassCode = async (societyId) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `DH-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await DailyHelp.findOne({ societyId, passCode: code });
    if (!existing) return code;
  }
  return `DH-${Date.now().toString().slice(-5)}`;
};

// 1. Get Daily Help Directory
export const getDailyHelpList = async (req, res, next) => {
  try {
    const { category, search, myStaffOnly, isInside } = req.query;
    const query = { societyId: req.societyId, status: { $ne: 'SUSPENDED' } };

    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    if (isInside !== undefined && isInside !== '') {
      query.isInside = isInside === 'true';
    }

    if (myStaffOnly === 'true' && req.user.apartmentId) {
      query['assignedUnits.apartmentId'] = req.user.apartmentId;
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { passCode: regex }];
    }

    const staffList = await DailyHelp.find(query)
      .populate('assignedUnits.apartmentId', 'unitNumber')
      .populate('assignedUnits.residentId', 'name phone')
      .sort({ isInside: -1, rating: -1, name: 1 });

    res.json({
      success: true,
      count: staffList.length,
      data: staffList
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Single Daily Help Details
export const getDailyHelpById = async (req, res, next) => {
  try {
    const staff = await DailyHelp.findOne({ _id: req.params.id, societyId: req.societyId })
      .populate('assignedUnits.apartmentId', 'unitNumber')
      .populate('assignedUnits.residentId', 'name phone')
      .populate('reviews.residentId', 'name')
      .populate('reviews.apartmentId', 'unitNumber');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Daily help profile not found' });
    }

    // Fetch recent 10 logs
    const recentLogs = await DailyHelpLog.find({ staffId: staff._id, societyId: req.societyId })
      .populate('guardInId', 'name')
      .populate('guardOutId', 'name')
      .sort({ entryTime: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        staff,
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Register New Daily Help
export const createDailyHelp = async (req, res, next) => {
  try {
    const { name, phone, category, vehicleNumber, idProof, emergencyContact, notes, assignToMyApartment } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
    }

    const passCode = await generateDailyHelpPassCode(req.societyId);

    const assignedUnits = [];
    if (assignToMyApartment && req.user.apartmentId) {
      assignedUnits.push({
        apartmentId: req.user.apartmentId,
        residentId: req.user._id,
        assignedAt: new Date()
      });
    }

    const newStaff = await DailyHelp.create({
      societyId: req.societyId,
      name: name.trim(),
      phone: phone.trim(),
      category: category || 'MAID',
      passCode,
      vehicleNumber: vehicleNumber || '',
      idProof: idProof || { idType: 'AADHAAR', idNumber: '' },
      emergencyContact: emergencyContact || { name: '', phone: '' },
      notes: notes || '',
      assignedUnits
    });

    res.status(201).json({
      success: true,
      message: `${newStaff.name} registered successfully with Pass Code: ${passCode}`,
      data: newStaff
    });
  } catch (error) {
    next(error);
  }
};

// 4. Assign Staff to Resident's Apartment
export const assignStaffToApartment = async (req, res, next) => {
  try {
    if (!req.user.apartmentId) {
      return res.status(400).json({ success: false, message: 'You must be assigned to an apartment to hire domestic staff.' });
    }

    const staff = await DailyHelp.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const alreadyAssigned = staff.assignedUnits.some(
      (u) => u.apartmentId.toString() === req.user.apartmentId.toString()
    );

    if (alreadyAssigned) {
      return res.json({ success: true, message: 'Staff is already assigned to your unit.', data: staff });
    }

    staff.assignedUnits.push({
      apartmentId: req.user.apartmentId,
      residentId: req.user._id,
      assignedAt: new Date()
    });

    await staff.save();

    res.json({
      success: true,
      message: `${staff.name} successfully added to your household staff list.`,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// 5. Unassign Staff from Resident's Apartment
export const unassignStaffFromApartment = async (req, res, next) => {
  try {
    if (!req.user.apartmentId) {
      return res.status(400).json({ success: false, message: 'Apartment identifier required.' });
    }

    const staff = await DailyHelp.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    staff.assignedUnits = staff.assignedUnits.filter(
      (u) => u.apartmentId.toString() !== req.user.apartmentId.toString()
    );

    await staff.save();

    res.json({
      success: true,
      message: `${staff.name} removed from your household staff list.`,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// 6. Submit a Review & Rating
export const addStaffReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5.' });
    }

    const staff = await DailyHelp.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Add review
    staff.reviews.push({
      residentId: req.user._id,
      apartmentId: req.user.apartmentId || null,
      rating: numericRating,
      comment: comment?.trim() || '',
      createdAt: new Date()
    });

    // Recalculate average rating
    const totalScore = staff.reviews.reduce((sum, r) => sum + r.rating, 0);
    staff.reviewCount = staff.reviews.length;
    staff.rating = Number((totalScore / staff.reviewCount).toFixed(1));

    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: {
        rating: staff.rating,
        reviewCount: staff.reviewCount,
        reviews: staff.reviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// 7. Security Guard Verifies Pass / Phone
export const verifyDailyHelpPass = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Pass code or phone number is required.' });
    }

    const clean = code.trim().toUpperCase();
    const staff = await DailyHelp.findOne({
      societyId: req.societyId,
      $or: [{ passCode: clean }, { phone: code.trim() }]
    })
      .populate('assignedUnits.apartmentId', 'unitNumber')
      .populate('assignedUnits.residentId', 'name phone');

    if (!staff) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'No active domestic staff found with this code or phone number.'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// 8. Security Guard Checks In Daily Help (Gate Entry)
export const checkInDailyHelp = async (req, res, next) => {
  try {
    const staff = await DailyHelp.findOne({ _id: req.params.id, societyId: req.societyId })
      .populate('assignedUnits.apartmentId', 'unitNumber')
      .populate('assignedUnits.residentId', 'name phone');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (staff.isInside) {
      return res.status(400).json({
        success: false,
        message: `${staff.name} is already recorded as INSIDE premises since ${new Date(staff.lastEntryTime).toLocaleTimeString()}.`
      });
    }

    const now = new Date();
    const log = await DailyHelpLog.create({
      societyId: req.societyId,
      staffId: staff._id,
      entryTime: now,
      guardInId: req.user._id,
      gateNumber: req.body.gateNumber || 'Gate 1'
    });

    staff.isInside = true;
    staff.lastEntryTime = now;
    staff.currentLogId = log._id;
    await staff.save();

    // Broadcast real-time entry notification to all assigned residents
    for (const unit of staff.assignedUnits) {
      if (unit.residentId) {
        await createNotification({
          societyId: req.societyId,
          recipientId: unit.residentId._id || unit.residentId,
          type: 'VISITOR_CHECKED_IN',
          title: `Domestic Staff Arrived: ${staff.name}`,
          message: `${staff.name} (${staff.category}) entered through Gate 1 at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          link: '/resident/daily-help'
        });
      }
    }

    res.json({
      success: true,
      message: `${staff.name} checked in successfully. Assigned residents notified.`,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// 9. Security Guard Checks Out Daily Help (Gate Exit)
export const checkOutDailyHelp = async (req, res, next) => {
  try {
    const staff = await DailyHelp.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (!staff.isInside) {
      return res.status(400).json({
        success: false,
        message: `${staff.name} is not currently marked as inside the society.`
      });
    }

    const now = new Date();

    if (staff.currentLogId) {
      await DailyHelpLog.findByIdAndUpdate(staff.currentLogId, {
        exitTime: now,
        guardOutId: req.user._id
      });
    }

    staff.isInside = false;
    staff.lastExitTime = now;
    staff.currentLogId = null;
    await staff.save();

    res.json({
      success: true,
      message: `${staff.name} checked out at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// 10. Get All Staff Currently Inside Premises
export const getActiveStaffInside = async (req, res, next) => {
  try {
    const activeStaff = await DailyHelp.find({
      societyId: req.societyId,
      isInside: true
    })
      .populate('assignedUnits.apartmentId', 'unitNumber')
      .populate('assignedUnits.residentId', 'name phone')
      .sort({ lastEntryTime: -1 });

    res.json({
      success: true,
      count: activeStaff.length,
      data: activeStaff
    });
  } catch (error) {
    next(error);
  }
};
