import { Society } from '../models/Society.js';
import { Building } from '../models/Building.js';
import { Apartment } from '../models/Apartment.js';
import { User } from '../models/User.js';
import { CommitteeMember } from '../models/CommitteeMember.js';
import { ROLES } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';

// Get current society details
export const getCurrentSociety = async (req, res, next) => {
  try {
    const society = await Society.findById(req.societyId);
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }
    res.json({ success: true, data: society });
  } catch (error) {
    next(error);
  }
};

// Update society settings
export const updateSocietySettings = async (req, res, next) => {
  try {
    const society = await Society.findById(req.societyId);
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const previousState = society.settings ? society.settings.toObject() : {};
    if (req.body.settings) {
      Object.assign(society.settings, req.body.settings);
    }
    if (req.body.contactEmail) society.contactEmail = req.body.contactEmail;
    if (req.body.contactPhone) society.contactPhone = req.body.contactPhone;

    await society.save();

    await logAudit({
      req,
      action: 'UPDATE_SOCIETY_SETTINGS',
      entity: 'Society',
      entityId: society._id,
      previousState,
      newState: society.settings
    });

    res.json({ success: true, message: 'Settings updated successfully', data: society });
  } catch (error) {
    next(error);
  }
};

// Get buildings/wings
export const getBuildings = async (req, res, next) => {
  try {
    const buildings = await Building.find({ societyId: req.societyId }).sort({ code: 1 });
    res.json({ success: true, data: buildings });
  } catch (error) {
    next(error);
  }
};

// Create a building/wing
export const createBuilding = async (req, res, next) => {
  try {
    const { name, code, floorsCount, totalUnits } = req.body;
    const building = await Building.create({
      societyId: req.societyId,
      name,
      code: code.toUpperCase(),
      floorsCount: floorsCount || 4,
      totalUnits: totalUnits || 16
    });

    await logAudit({
      req,
      action: 'CREATE_BUILDING',
      entity: 'Building',
      entityId: building._id,
      newState: building
    });

    res.status(201).json({ success: true, message: 'Building wing created', data: building });
  } catch (error) {
    next(error);
  }
};

// Get apartments with search, filter, pagination
export const getApartments = async (req, res, next) => {
  try {
    const { buildingId, status, search, page = 1, limit = 50 } = req.query;
    const query = { societyId: req.societyId };

    if (buildingId) query.buildingId = buildingId;
    if (status) query.status = status;
    if (search) {
      query.unitNumber = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Apartment.countDocuments(query);

    const apartments = await Apartment.find(query)
      .populate('buildingId', 'name code')
      .populate('ownerId', 'name email phone')
      .populate('tenantId', 'name email phone')
      .sort({ unitNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: apartments,
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

// Create an apartment
export const createApartment = async (req, res, next) => {
  try {
    const { buildingId, unitNumber, floorNumber, type, areaSqFt, ownerId, tenantId, status } = req.body;

    const apartment = await Apartment.create({
      societyId: req.societyId,
      buildingId,
      unitNumber,
      floorNumber,
      type: type || '2BHK',
      areaSqFt: areaSqFt || 1100,
      ownerId: ownerId || null,
      tenantId: tenantId || null,
      status: status || (ownerId || tenantId ? 'OCCUPIED' : 'VACANT')
    });

    res.status(201).json({ success: true, message: 'Apartment unit created', data: apartment });
  } catch (error) {
    next(error);
  }
};

// Get all society users (Directory)
export const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const query = { societyId: req.societyId };

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: users,
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

// Update user role (Admin only)
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const assignableRoles = [
      ROLES.ADMIN,
      ROLES.CHAIRMAN,
      ROLES.SECRETARY,
      ROLES.TREASURER,
      ROLES.COMMITTEE_MEMBER,
      ROLES.RESIDENT,
      ROLES.SECURITY,
      ROLES.VENDOR
    ];

    if (!assignableRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or restricted role assignment.',
        code: 'INVALID_ROLE_ASSIGNMENT'
      });
    }

    if (role === ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only a Super Admin can assign the Admin role.',
        code: 'ROLE_ASSIGNMENT_FORBIDDEN'
      });
    }

    const user = await User.findOne({ _id: req.params.id, societyId: req.societyId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in this society' });
    }

    const previousRole = user.role;
    const committeeRoles = [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.COMMITTEE_MEMBER];
    const committeeRecord = await CommitteeMember.findOne({ societyId: req.societyId, userId: user._id });
    if (committeeRoles.includes(role)) {
      const conflict = role !== ROLES.COMMITTEE_MEMBER && await CommitteeMember.exists({
        societyId: req.societyId,
        designation: role,
        status: 'ACTIVE',
        userId: { $ne: user._id }
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: `An active ${role.toLowerCase().replaceAll('_', ' ')} already exists in this society.`, code: 'OFFICE_HOLDER_EXISTS' });
      }

      const now = new Date();
      if (committeeRecord) {
        const wasInactive = committeeRecord.status !== 'ACTIVE';
        committeeRecord.designation = role;
        committeeRecord.status = 'ACTIVE';
        if (wasInactive || !committeeRecord.termStart || !committeeRecord.termEnd) {
          committeeRecord.termStart = now;
          committeeRecord.termEnd = new Date(now);
          committeeRecord.termEnd.setFullYear(committeeRecord.termEnd.getFullYear() + 1);
        }
        await committeeRecord.save();
      } else {
        const termEnd = new Date(now);
        termEnd.setFullYear(termEnd.getFullYear() + 1);
        await CommitteeMember.create({ societyId: req.societyId, userId: user._id, designation: role, termStart: now, termEnd, status: 'ACTIVE' });
      }
    } else if (committeeRecord && committeeRoles.includes(previousRole) && committeeRecord.status === 'ACTIVE') {
      const previousMembership = { designation: committeeRecord.designation, status: committeeRecord.status };
      committeeRecord.status = 'INACTIVE';
      await committeeRecord.save();
      await logAudit({ req, action: 'COMMITTEE_MEMBER_REMOVED', entity: 'CommitteeMember', entityId: committeeRecord._id, previousState: previousMembership, newState: { designation: committeeRecord.designation, status: committeeRecord.status, reason: 'USER_ROLE_CHANGED' } });
    }

    user.role = role;
    await user.save();

    await logAudit({
      req,
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: user._id,
      previousState: { role: previousRole },
      newState: { role }
    });

    res.json({ success: true, message: `Role updated to ${role}`, data: user });
  } catch (error) {
    next(error);
  }
};

// Manage Family members (Resident)
export const getFamilyMembers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user.familyMembers || [] });
  } catch (error) {
    next(error);
  }
};

export const addFamilyMember = async (req, res, next) => {
  try {
    const { name, relation, phone } = req.body;
    const user = await User.findById(req.user._id);

    user.familyMembers.push({ name, relation, phone });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Family member registered',
      data: user.familyMembers
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFamilyMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const user = await User.findById(req.user._id);

    user.familyMembers = user.familyMembers.filter(m => m._id.toString() !== memberId);
    await user.save();

    res.json({
      success: true,
      message: 'Family member removed',
      data: user.familyMembers
    });
  } catch (error) {
    next(error);
  }
};
