import { ROLE_PERMISSIONS, ROLES } from '../constants/index.js';

// Legacy role-based check (kept for compatibility). Accepts role names.
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization.',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

// Permission-based middleware. Use this for fine-grained authorization.
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.', code: 'UNAUTHORIZED' });
    }

    const role = req.user.role;
    const permissions = ROLE_PERMISSIONS[role] || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.', code: 'FORBIDDEN' });
    }

    next();
  };
};

export const requireAnyPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.', code: 'UNAUTHORIZED' });
    }

    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!requiredPermissions.some((permission) => permissions.includes(permission))) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.', code: 'FORBIDDEN' });
    }

    next();
  };
};

// Governance actions are delegated to society officers and committee members.
// Super Admin retains platform access, but does not automatically act as a society officer.
export const requireSocietyPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.', code: 'UNAUTHORIZED' });
    if (req.user.role === ROLES.SUPER_ADMIN || !(ROLE_PERMISSIONS[req.user.role] || []).includes(permission)) {
      return res.status(403).json({ success: false, message: 'Forbidden: society governance permission required.', code: 'FORBIDDEN' });
    }
    next();
  };
};

export const requireAnySocietyPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.', code: 'UNAUTHORIZED' });
    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (req.user.role === ROLES.SUPER_ADMIN || !requiredPermissions.some((permission) => permissions.includes(permission))) {
      return res.status(403).json({ success: false, message: 'Forbidden: society governance permission required.', code: 'FORBIDDEN' });
    }
    next();
  };
};
