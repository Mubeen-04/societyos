import { Amenity } from '../models/Amenity.js';
import { AmenityBooking } from '../models/AmenityBooking.js';
import { ROLES } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

// List amenities
export const getAmenities = async (req, res, next) => {
  try {
    const amenities = await Amenity.find({ societyId: req.societyId, isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: amenities });
  } catch (error) {
    next(error);
  }
};

// Create an amenity (Admin only)
export const createAmenity = async (req, res, next) => {
  try {
    const amenity = await Amenity.create({
      ...req.body,
      societyId: req.societyId
    });

    await logAudit({
      req,
      action: 'CREATE_AMENITY',
      entity: 'Amenity',
      entityId: amenity._id,
      newState: amenity
    });

    res.status(201).json({ success: true, message: 'Amenity created', data: amenity });
  } catch (error) {
    next(error);
  }
};

// Generate and get slot availability for an amenity on a specific date
export const getAmenitySlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ success: false, message: 'Query parameter date (YYYY-MM-DD) is required' });
    }

    const amenity = await Amenity.findOne({ _id: id, societyId: req.societyId });
    if (!amenity) {
      return res.status(404).json({ success: false, message: 'Amenity not found' });
    }

    // Parse opening and closing times
    const [openH, openM] = amenity.openingTime.split(':').map(Number);
    const [closeH, closeM] = amenity.closingTime.split(':').map(Number);

    const slotDuration = amenity.slotDurationMinutes || 60;
    const slots = [];

    let currentMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    while (currentMinutes + slotDuration <= endMinutes) {
      const startH = Math.floor(currentMinutes / 60);
      const startM = currentMinutes % 60;
      const endH = Math.floor((currentMinutes + slotDuration) / 60);
      const endM = (currentMinutes + slotDuration) % 60;

      const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      slots.push({
        startTime: startTimeStr,
        endTime: endTimeStr,
        capacity: amenity.capacityPerSlot,
        available: true,
        bookedCount: 0
      });

      currentMinutes += slotDuration;
    }

    // Query existing confirmed bookings for this date
    const existingBookings = await AmenityBooking.find({
      societyId: req.societyId,
      amenityId: id,
      bookingDate: date,
      status: 'CONFIRMED'
    });

    // Mark slot availability
    const enrichedSlots = slots.map(slot => {
      const matchingBookings = existingBookings.filter(
        b => b.startTime === slot.startTime && b.endTime === slot.endTime
      );
      const bookedCount = matchingBookings.length;
      const isAvailable = bookedCount < amenity.capacityPerSlot;

      return {
        ...slot,
        bookedCount,
        available: isAvailable
      };
    });

    res.json({
      success: true,
      data: {
        amenity: {
          id: amenity._id,
          name: amenity.name,
          category: amenity.category,
          pricingType: amenity.pricingType,
          hourlyRate: amenity.hourlyRate,
          rules: amenity.rules
        },
        date,
        slots: enrichedSlots
      }
    });
  } catch (error) {
    next(error);
  }
};

// Book an amenity slot (Handles concurrent double-booking prevention)
export const bookAmenitySlot = async (req, res, next) => {
  try {
    const { amenityId, bookingDate, startTime, endTime, attendeesCount } = req.body;

    const apartmentId = req.user.apartmentId;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Must be associated with an apartment to book amenities.'
      });
    }

    const amenity = await Amenity.findOne({ _id: amenityId, societyId: req.societyId, isActive: true });
    if (!amenity) {
      return res.status(404).json({ success: false, message: 'Amenity not found or inactive' });
    }

    // Check existing confirmed bookings for this exact slot
    const existingBookingsCount = await AmenityBooking.countDocuments({
      societyId: req.societyId,
      amenityId,
      bookingDate,
      startTime,
      endTime,
      status: 'CONFIRMED'
    });

    if (existingBookingsCount >= amenity.capacityPerSlot) {
      return res.status(409).json({
        success: false,
        message: 'Collision Alert: This slot was just booked by another resident. Please select an alternate time.',
        code: 'SLOT_UNAVAILABLE'
      });
    }

    const totalCharge = amenity.pricingType === 'PAID' ? amenity.hourlyRate : 0;

    const booking = await AmenityBooking.create({
      societyId: req.societyId,
      amenityId,
      userId: req.user._id,
      apartmentId,
      bookingDate,
      startTime,
      endTime,
      attendeesCount: attendeesCount || 1,
      status: 'CONFIRMED',
      totalCharge
    });

    await logAudit({
      req,
      action: 'BOOK_AMENITY',
      entity: 'AmenityBooking',
      entityId: booking._id,
      newState: { amenityId, bookingDate, startTime, endTime }
    });

    await createNotification({
      societyId: req.societyId,
      recipientId: req.user._id,
      type: 'AMENITY_BOOKED',
      title: 'Amenity Booking Confirmed',
      message: `Your booking for ${amenity.name} on ${bookingDate} (${startTime} - ${endTime}) is confirmed.`,
      link: '/amenities'
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking
export const cancelBooking = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;
    const query = { _id: req.params.id, societyId: req.societyId };

    if (req.user.role === ROLES.RESIDENT) {
      query.userId = req.user._id;
    }

    const booking = await AmenityBooking.findOne(query).populate('amenityId', 'name');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or unauthorized' });
    }

    booking.status = 'CANCELLED';
    booking.cancellationReason = cancellationReason || 'Cancelled by resident';
    await booking.save();

    await logAudit({
      req,
      action: 'CANCEL_AMENITY_BOOKING',
      entity: 'AmenityBooking',
      entityId: booking._id,
      newState: { status: 'CANCELLED' }
    });

    res.json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    next(error);
  }
};

// Get bookings history
export const getMyBookings = async (req, res, next) => {
  try {
    const query = { societyId: req.societyId };
    if (req.user.role === ROLES.RESIDENT) {
      query.userId = req.user._id;
    }

    const bookings = await AmenityBooking.find(query)
      .populate('amenityId', 'name category pricingType hourlyRate')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};
