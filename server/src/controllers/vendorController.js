import { Vendor } from '../models/Vendor.js';
import { ROLES } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';

export const getVendors = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { societyId: req.societyId };
    if (category) query.category = category;

    const vendors = await Vendor.find(query).sort({ rating: -1, companyName: 1 });
    res.json({ success: true, data: vendors });
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.create({
      ...req.body,
      societyId: req.societyId
    });

    await logAudit({
      req,
      action: 'CREATE_VENDOR',
      entity: 'Vendor',
      entityId: vendor._id,
      newState: vendor
    });

    res.status(201).json({ success: true, message: 'Vendor added', data: vendor });
  } catch (error) {
    next(error);
  }
};
