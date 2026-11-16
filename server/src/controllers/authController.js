import { User } from '../models/User.js';
import { Society } from '../models/Society.js';
import { ROLES } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';

// Register a new Society + Super Admin OR a user under an existing society
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, societyCode, societyName, apartmentId } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
        code: 'EMAIL_EXISTS'
      });
    }

    let society;
    let createdSociety = false;

    if (societyCode) {
      society = await Society.findOne({ code: societyCode.toUpperCase() });
      if (!society) {
        return res.status(404).json({
          success: false,
          message: `Society with code '${societyCode}' was not found.`,
          code: 'SOCIETY_NOT_FOUND'
        });
      }
    } else if (societyName) {
      // Create new Society along with first Admin
      const generatedCode = societyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
      society = await Society.create({
        name: societyName,
        code: generatedCode
      });
      createdSociety = true;
    } else {
      // Default to first society in DB if available
      society = await Society.findOne();
      if (!society) {
        society = await Society.create({
          name: 'Green Valley Residency',
          code: 'GVR-2026'
        });
      }
    }

    // Public registration may create the first Admin for a new society or a
    // Resident in an existing society. Elevated roles are assigned through
    // protected administration workflows only.
    const assignedRole = createdSociety ? ROLES.ADMIN : ROLES.RESIDENT;

    const user = await User.create({
      societyId: society._id,
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: assignedRole,
      apartmentId: apartmentId || null
    });

    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          societyId: user.societyId,
          societyName: society.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req, res, next) => {
  try {
    const rawEmail = req.body.email || '';
    const rawPassword = req.body.password || '';
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const user = await User.findOne({ email })
      .select('+password')
      .populate('societyId', 'name code settings')
      .populate('apartmentId');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact society management.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          societyId: user.societyId?._id || user.societyId,
          societyName: user.societyId?.name || 'SocietyOS Community',
          societySettings: user.societyId?.settings,
          apartment: user.apartmentId,
          occupancyType: user.occupancyType
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current authenticated user details
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('societyId', 'name code address settings')
      .populate({
        path: 'apartmentId',
        populate: { path: 'buildingId', select: 'name code' }
      });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Change Password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.',
        code: 'INCORRECT_PASSWORD'
      });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      req,
      action: 'USER_PASSWORD_CHANGE',
      entity: 'User',
      entityId: user._id
    });

    res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};
