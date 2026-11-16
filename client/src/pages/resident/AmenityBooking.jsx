import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Calendar, Clock, Users, DollarSign, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const AmenityBooking = () => {
  const [amenities, setAmenities] = useState([]);
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotsData, setSlotsData] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingConflictMsg, setBookingConflictMsg] = useState('');

  const fetchAmenitiesAndBookings = async () => {
    try {
      const [amenRes, bookRes] = await Promise.all([
        api.get('/amenities'),
        api.get('/amenities/bookings')
      ]);
      if (amenRes.success) {
        setAmenities(amenRes.data);
        if (amenRes.data.length > 0 && !selectedAmenity) {
          setSelectedAmenity(amenRes.data[0]);
        }
      }
      if (bookRes.success) {
        setMyBookings(bookRes.data);
      }
    } catch (err) {
      console.error('Error fetching amenities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenitiesAndBookings();
  }, []);

  // Fetch slots whenever selected amenity or date changes
  useEffect(() => {
    if (!selectedAmenity) return;

    const fetchSlots = async () => {
      try {
        const res = await api.get(`/amenities/${selectedAmenity._id}/slots?date=${selectedDate}`);
        if (res.success) {
          setSlotsData(res.data.slots || []);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
      }
    };

    fetchSlots();
  }, [selectedAmenity, selectedDate]);

  const handleBookSlot = async (slot) => {
    setBookingConflictMsg('');
    setBookingLoading(true);
    try {
      const res = await api.post('/amenities/book', {
        amenityId: selectedAmenity._id,
        bookingDate: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        attendeesCount: 1
      });

      if (res.success) {
        // Refresh slots and bookings
        fetchAmenitiesAndBookings();
        const slotRes = await api.get(`/amenities/${selectedAmenity._id}/slots?date=${selectedDate}`);
        if (slotRes.success) setSlotsData(slotRes.data.slots || []);
      }
    } catch (err) {
      if (err.code === 'SLOT_UNAVAILABLE') {
        setBookingConflictMsg(err.message);
      } else {
        alert(err.message || 'Failed to book slot');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you wish to cancel this reservation?')) return;
    try {
      await api.patch(`/amenities/bookings/${bookingId}/cancel`, {
        cancellationReason: 'Cancelled by resident'
      });
      fetchAmenitiesAndBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Society Amenities & Clubhouse Reservation</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atomic slot reservations with strict concurrent double-booking protection
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading society amenities..." />
      ) : (
        <>
          {/* Amenity Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {amenities.map((item) => {
              const isSelected = selectedAmenity?._id === item._id;
              return (
                <div
                  key={item._id}
                  onClick={() => setSelectedAmenity(item)}
                  className={`glass-card p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-slate-800 shadow-lg shadow-teal-500/10'
                      : 'hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-teal-400">
                      {item.category}
                    </span>
                    <Badge variant={item.pricingType === 'FREE' ? 'APPROVED' : 'IN_PROGRESS'}>
                      {item.pricingType === 'FREE' ? 'Complimentary' : `₹${item.hourlyRate}/hr`}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-2">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Hours: {item.openingTime} - {item.closingTime}</span>
                    <span className="font-semibold text-slate-200">Cap: {item.capacityPerSlot}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slot Scheduler Grid */}
          {selectedAmenity && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Schedule for {selectedAmenity.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your preferred time slot for reservation
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <span>Select Date:</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field py-1.5 text-xs w-auto font-mono"
                  />
                </div>
              </div>

              {bookingConflictMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{bookingConflictMsg}</span>
                </div>
              )}

              {/* Time Slots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {slotsData.map((slot, index) => {
                  const isAvailable = slot.available;
                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isAvailable
                          ? 'bg-slate-800/80 border-slate-700/80 hover:border-teal-500/60'
                          : 'bg-slate-900/50 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold text-slate-200 block">
                        {slot.startTime} - {slot.endTime}
                      </span>

                      <div className="mt-2">
                        {isAvailable ? (
                          <button
                            onClick={() => handleBookSlot(slot)}
                            disabled={bookingLoading}
                            className="w-full btn-primary text-[11px] py-1 font-semibold"
                          >
                            Reserve
                          </button>
                        ) : (
                          <span className="inline-block w-full py-1 text-[10px] font-bold uppercase rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Booked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* My Bookings History */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>My Booking Reservations</span>
            </h2>

            {myBookings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">You have no active amenity bookings.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {myBookings.map((b) => (
                  <div key={b._id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{b.amenityId?.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {b.bookingDate} • {b.startTime} - {b.endTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={b.status}>{b.status}</Badge>
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(b._id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
