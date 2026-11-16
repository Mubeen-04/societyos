import { ParkingSlot } from '../models/ParkingSlot.js';
import { logAudit } from '../services/auditService.js';

// Get parking slots
export const getParkingSlots = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const query = { societyId: req.societyId };

    if (type) query.type = type;
    if (status) query.status = status;

    const slots = await ParkingSlot.find(query)
      .populate('assignedApartmentId', 'unitNumber')
      .populate('assignedResidentId', 'name phone')
      .populate('buildingId', 'name code')
      .sort({ slotNumber: 1 });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

// Create a parking slot (Admin)
export const createParkingSlot = async (req, res, next) => {
  try {
    const { slotNumber, type, buildingId, floorLevel } = req.body;

    const slot = await ParkingSlot.create({
      societyId: req.societyId,
      slotNumber: slotNumber.toUpperCase(),
      type: type || 'RESIDENT',
      buildingId: buildingId || null,
      floorLevel: floorLevel || 'Ground Level',
      status: 'AVAILABLE'
    });

    res.status(201).json({ success: true, message: 'Parking slot created', data: slot });
  } catch (error) {
    next(error);
  }
};

// Assign parking slot to apartment / resident
export const assignParkingSlot = async (req, res, next) => {
  try {
    const { slotId, apartmentId, residentId, vehicleType, vehicleNumber } = req.body;

    const slot = await ParkingSlot.findOne({ _id: slotId, societyId: req.societyId });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Parking slot not found' });
    }

    slot.assignedApartmentId = apartmentId;
    slot.assignedResidentId = residentId;
    slot.vehicleType = vehicleType;
    slot.vehicleNumber = vehicleNumber ? vehicleNumber.toUpperCase() : '';
    slot.status = 'OCCUPIED';

    await slot.save();

    await logAudit({
      req,
      action: 'ASSIGN_PARKING_SLOT',
      entity: 'ParkingSlot',
      entityId: slot._id,
      newState: { slotNumber: slot.slotNumber, apartmentId, vehicleNumber }
    });

    res.json({ success: true, message: 'Parking slot assigned successfully', data: slot });
  } catch (error) {
    next(error);
  }
};

// Get resident's assigned parking
export const getMyParking = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findOne({
      societyId: req.societyId,
      $or: [
        { assignedResidentId: req.user._id },
        { assignedApartmentId: req.user.apartmentId }
      ]
    }).populate('buildingId', 'name code');

    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};
