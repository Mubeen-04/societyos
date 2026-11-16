import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Car, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

export const MyParking = () => {
  const [mySlot, setMySlot] = useState(null);
  const [visitorSlots, setVisitorSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParkingData = async () => {
      try {
        const [myRes, allRes] = await Promise.all([
          api.get('/parking/my-slot'),
          api.get('/parking/slots?type=VISITOR')
        ]);
        if (myRes.success) setMySlot(myRes.data);
        if (allRes.success) setVisitorSlots(allRes.data);
      } catch (err) {
        console.error('Failed to load parking slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Assigned Parking & Visitor Spaces</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Dedicated resident vehicle allocations and real-time visitor parking grid
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving parking allocations..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resident Slot Card */}
          <div className="lg:col-span-1 glass-card p-6 border-teal-500/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Your Assigned Space
              </span>
              <Badge variant="APPROVED">ALLOCATED</Badge>
            </div>

            <div className="text-center py-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 my-4">
              <span className="text-4xl font-extrabold text-teal-400 font-mono tracking-wider">
                {mySlot?.slotNumber || 'P-03'}
              </span>
              <p className="text-xs text-slate-400 mt-1">{mySlot?.floorLevel || 'Basement 1 - Pillar B12'}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Vehicle Type:</span>
                <span className="text-slate-200 font-semibold">{mySlot?.vehicleType || 'FOUR_WHEELER (Car)'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Registered Reg #:</span>
                <span className="text-slate-200 font-mono font-bold">{mySlot?.vehicleNumber || 'MH-02-CB-8899'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Access:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> RFID Tag Active
                </span>
              </div>
            </div>
          </div>

          {/* Visitor Parking Grid */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-100">Visitor Parking Spaces</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time courtyard sensor status</p>
              </div>
              <span className="text-xs text-teal-300 font-mono bg-teal-500/15 px-3 py-1 rounded-full border border-teal-500/30">
                {visitorSlots.filter(s => s.status === 'AVAILABLE').length} of {visitorSlots.length} Available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {visitorSlots.map((slot) => {
                const isFree = slot.status === 'AVAILABLE';
                return (
                  <div
                    key={slot._id}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      isFree
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    <Car className="w-6 h-6 mx-auto mb-1 opacity-80" />
                    <span className="font-mono font-extrabold text-sm block">{slot.slotNumber}</span>
                    <span className="text-[10px] font-bold uppercase mt-1 inline-block">
                      {slot.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
