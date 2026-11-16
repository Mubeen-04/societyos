export const tenantGuard = (req, res, next) => {
  if (!req.user || !req.societyId) {
    return res.status(401).json({
      success: false,
      message: 'Society context missing.',
      code: 'TENANT_CONTEXT_MISSING'
    });
  }

  // If a societyId parameter or body is explicitly provided, verify it matches
  const targetSocietyId = req.params.societyId || req.body.societyId || req.query.societyId;
  if (targetSocietyId && targetSocietyId.toString() !== req.societyId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Security Alert: Cross-tenant society access is prohibited.',
      code: 'CROSS_TENANT_VIOLATION'
    });
  }

  next();
};
