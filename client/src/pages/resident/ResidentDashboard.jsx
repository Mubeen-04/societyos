import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  CreditCard,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Megaphone,
  ArrowUpRight,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const ResidentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    maintenanceDue: 0,
    openComplaintsCount: 0,
    upcomingBookingsCount: 0,
    expectedVisitorsCount: 0
  });
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [sumRes, annRes, evtRes] = await Promise.all([
          api.get('/analytics/resident-summary'),
          api.get('/community/announcements'),
          api.get('/community/events')
        ]);

        if (sumRes.success) setSummary(sumRes.data);
        if (annRes.success) setAnnouncements(annRes.data.slice(0, 3));
        if (evtRes.success) setEvents(evtRes.data.slice(0, 2));
      } catch (err) {
        console.error('Failed to load resident summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900/60 via-slate-900 to-emerald-950/60 border border-teal-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resident Portal • Unit {user?.apartment?.unitNumber || 'A-102'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              All services, visitor approvals, society billing, and amenity bookings are synced in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/resident/visitors')}
              className="btn-primary text-xs gap-2 py-2.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Pre-Approve Visitor</span>
            </button>
            <button
              onClick={() => navigate('/resident/complaints')}
              className="btn-secondary text-xs gap-2 py-2.5"
            >
              <span>Raise Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maintenance Dues Card */}
        <div className="stat-card group hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Maintenance Dues</span>
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">
            ₹{summary.maintenanceDue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60 text-xs">
            {summary.maintenanceDue > 0 ? (
              <>
                <span className="text-amber-400 font-medium">Due for Sep 2026</span>
                <button
                  onClick={() => navigate('/resident/bills')}
                  className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                >
                  Pay Now <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All dues cleared
              </span>
            )}
          </div>
        </div>

        {/* Open Complaints Card */}
        <div className="stat-card group hover:border-sky-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Open Complaints</span>
            <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{summary.openComplaintsCount}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60 text-xs">
            <span className="text-slate-400">In Triage / In Progress</span>
            <button
              onClick={() => navigate('/resident/complaints')}
              className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              View <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Upcoming Amenity Bookings */}
        <div className="stat-card group hover:border-teal-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Upcoming Bookings</span>
            <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{summary.upcomingBookingsCount}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60 text-xs">
            <span className="text-teal-400 font-medium">Clubhouse Banquet</span>
            <button
              onClick={() => navigate('/resident/amenities')}
              className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              Slots <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expected Visitors */}
        <div className="stat-card group hover:border-purple-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Expected Visitors</span>
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{summary.expectedVisitorsCount}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60 text-xs">
            <span className="text-slate-400">Passes generated</span>
            <button
              onClick={() => navigate('/resident/visitors')}
              className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              Passes <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Announcements + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bulletins Feed (2 cols) */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-slate-100">Society Announcements</h2>
            </div>
            <button
              onClick={() => navigate('/community')}
              className="text-xs text-teal-400 hover:underline font-medium"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann._id}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ann.pinned && (
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                        PINNED
                      </span>
                    )}
                    <Badge variant={ann.priority}>{ann.priority}</Badge>
                    <h3 className="text-xs font-bold text-slate-100">{ann.title}</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Community Events Card (1 col) */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-slate-100">Upcoming Events</h2>
            </div>
            <button
              onClick={() => navigate('/community')}
              className="text-xs text-teal-400 hover:underline font-medium"
            >
              RSVP
            </button>
          </div>

          <div className="space-y-4">
            {events.map((evt) => (
              <div key={evt._id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  {new Date(evt.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {evt.startTime}
                </span>
                <h4 className="text-xs font-bold text-slate-100 mt-1">{evt.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{evt.location}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/40">
                  <span>{evt.rsvps?.length || 0} Attending</span>
                  <span className="text-teal-400 font-semibold">Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
