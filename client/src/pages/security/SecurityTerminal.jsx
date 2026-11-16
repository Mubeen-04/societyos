import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ShieldCheck,
  QrCode,
  UserPlus,
  Users,
  LogOut,
  LogIn,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Phone,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

export const SecurityTerminal = () => {
  const [activeMode, setActiveMode] = useState('visitors'); // 'visitors' | 'staff'
  const [stats, setStats] = useState({
    expectedVisitors: 14,
    currentlyInside: 8,
    pendingApprovals: 3,
    todayEntries: 83,
    todayExits: 75
  });

  const [activeVisitors, setActiveVisitors] = useState([]);
  const [activeStaffInside, setActiveStaffInside] = useState([]);
  const [loading, setLoading] = useState(true);

  // Visitor pass verification state
  const [searchPassCode, setSearchPassCode] = useState('');
  const [verifiedPass, setVerifiedPass] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Daily Help verification state
  const [searchStaffCode, setSearchStaffCode] = useState('');
  const [verifiedStaff, setVerifiedStaff] = useState(null);
  const [verifyingStaff, setVerifyingStaff] = useState(false);
  const [staffVerifyError, setStaffVerifyError] = useState('');
  const [staffActionMsg, setStaffActionMsg] = useState(null);

  // Walk-in registration state
  const [walkinForm, setWalkinForm] = useState({
    visitorName: '',
    visitorPhone: '',
    purpose: 'DELIVERY',
    vehicleNumber: '',
    unitNumber: 'A-102'
  });
  const [submittingWalkin, setSubmittingWalkin] = useState(false);
  const [walkinStatusMsg, setWalkinStatusMsg] = useState(null);

  const fetchSecurityData = async () => {
    try {
      const [statsRes, activeRes, staffRes] = await Promise.all([
        api.get('/analytics/security-stats'),
        api.get('/visitors/active'),
        api.get('/daily-help/active')
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (activeRes.success) setActiveVisitors(activeRes.data);
      if (staffRes.success) setActiveStaffInside(staffRes.data || []);
    } catch (err) {
      console.error('Failed to load security terminal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Daily Help Pass Verification
  const handleVerifyStaff = async (e) => {
    e.preventDefault();
    if (!searchStaffCode.trim()) return;
    setVerifyingStaff(true);
    setStaffVerifyError('');
    setVerifiedStaff(null);
    setStaffActionMsg(null);

    try {
      const res = await api.post('/daily-help/verify-pass', { code: searchStaffCode.trim() });
      if (res.success) {
        setVerifiedStaff(res.data);
      }
    } catch (err) {
      setStaffVerifyError(err.message || 'Staff not found with this code or phone number.');
    } finally {
      setVerifyingStaff(false);
    }
  };

  // Check In Daily Help (Gate Entry)
  const handleCheckInStaff = async (staffId) => {
    try {
      const res = await api.post(`/daily-help/${staffId}/check-in`, { gateNumber: 'Gate 1' });
      if (res.success) {
        setStaffActionMsg(`Entry granted for ${res.data.name}. Assigned residents notified.`);
        setVerifiedStaff(res.data);
        fetchSecurityData();
      }
    } catch (err) {
      alert(err.message || 'Check-in failed');
    }
  };

  // Check Out Daily Help (Gate Exit)
  const handleCheckOutStaff = async (staffId) => {
    try {
      const res = await api.post(`/daily-help/${staffId}/check-out`);
      if (res.success) {
        setStaffActionMsg(`Check-out recorded for ${res.data.name}.`);
        setVerifiedStaff(res.data);
        fetchSecurityData();
      }
    } catch (err) {
      alert(err.message || 'Check-out failed');
    }
  };

  // Handle Pass Verification
  const handleVerifyPass = async (e) => {
    e.preventDefault();
    if (!searchPassCode) return;
    setVerifying(true);
    setVerifyError('');
    setVerifiedPass(null);

    try {
      const res = await api.post('/visitors/verify-pass', { passCode: searchPassCode });
      if (res.success) {
        setVerifiedPass(res.data);
      }
    } catch (err) {
      setVerifyError(err.message || 'Invalid or expired pass code');
    } finally {
      setVerifying(false);
    }
  };

  // Check In Visitor
  const handleCheckIn = async (visitorId) => {
    try {
      await api.post(`/visitors/${visitorId}/check-in`);
      setVerifiedPass(null);
      setSearchPassCode('');
      fetchSecurityData();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    }
  };

  // Check Out Visitor
  const handleCheckOut = async (visitorId) => {
    try {
      await api.post(`/visitors/${visitorId}/check-out`);
      fetchSecurityData();
    } catch (err) {
      alert(err.message || 'Check-out failed');
    }
  };

  // Handle Walk-in Registration
  const handleRegisterWalkIn = async (e) => {
    e.preventDefault();
    setSubmittingWalkin(true);
    setWalkinStatusMsg(null);

    try {
      const res = await api.post('/visitors/walk-in', walkinForm);
      if (res.success) {
        setWalkinStatusMsg({
          type: 'info',
          text: `Approval dispatched to resident of Unit ${walkinForm.unitNumber}. Visitor pass registered.`
        });
        setWalkinForm({
          visitorName: '',
          visitorPhone: '',
          purpose: 'DELIVERY',
          vehicleNumber: '',
          unitNumber: 'A-102'
        });
        fetchSecurityData();
      }
    } catch (err) {
      setWalkinStatusMsg({
        type: 'danger',
        text: err.message || 'Failed to dispatch walk-in approval'
      });
    } finally {
      setSubmittingWalkin(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Main Gate Terminal #1 • Online</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Security Gate Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant pass verification, walk-in resident dispatch, and real-time perimeter logging
          </p>
        </div>

        {/* Live Traffic Counters */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's In</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">{stats.todayEntries}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Out</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{stats.todayExits}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">Currently Inside</span>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{stats.currentlyInside}</p>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">Expected Passes</span>
          <p className="text-2xl font-bold text-teal-400 mt-2 font-mono">{stats.expectedVisitors}</p>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">Pending Approvals</span>
          <p className="text-2xl font-bold text-amber-400 mt-2 font-mono">{stats.pendingApprovals}</p>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">Gate State</span>
          <p className="text-xs font-bold text-emerald-400 mt-2 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Automated Boom Barrier Ready
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveMode('visitors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'visitors'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Visitor Passes & Walk-ins</span>
        </button>

        <button
          onClick={() => setActiveMode('staff')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'staff'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Daily Help & Domestic Staff</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {activeStaffInside.length} Inside
          </span>
        </button>
      </div>

      {activeMode === 'visitors' ? (
        <>
          {/* 2-Column Operational Grid: Pass Verification & Walk-In Dispatch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pass Verification & Check-In */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <QrCode className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Verify Pass / QR Code</h2>
              </div>

              <form onSubmit={handleVerifyPass} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Pass Code (e.g., VP-A94E21)"
                  value={searchPassCode}
                  onChange={(e) => setSearchPassCode(e.target.value.toUpperCase())}
                  className="input-field font-mono uppercase text-xs"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="btn-primary text-xs px-5 shrink-0"
                >
                  <span>{verifying ? 'Verifying...' : 'Verify Pass'}</span>
                </button>
              </form>

              {verifyError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {verifiedPass && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/50 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-300 text-sm">{verifiedPass.passCode}</span>
                    <Badge variant={verifiedPass.approvalStatus}>{verifiedPass.approvalStatus}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Visitor Name</span>
                      <p className="font-bold text-slate-100">{verifiedPass.visitorName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Destination Unit</span>
                      <p className="font-bold text-teal-300">{verifiedPass.apartmentId?.unitNumber}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Purpose</span>
                      <p className="text-slate-300">{verifiedPass.purpose}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Vehicle</span>
                      <p className="font-mono text-slate-300">{verifiedPass.vehicleNumber || 'On Foot'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCheckIn(verifiedPass._id)}
                    className="w-full btn-primary text-xs py-2.5 gap-2 mt-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Grant Entry & Open Gate</span>
                  </button>
                </div>
              )}
            </div>

            {/* Walk-in Visitor Live Dispatch */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <UserPlus className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Walk-in Visitor (Real-Time Approval)</h2>
              </div>

              {walkinStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    walkinStatusMsg.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : walkinStatusMsg.type === 'info'
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {walkinStatusMsg.text}
                </div>
              )}

              <form onSubmit={handleRegisterWalkIn} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Visitor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Zomato Delivery"
                      value={walkinForm.visitorName}
                      onChange={(e) => setWalkinForm({ ...walkinForm, visitorName: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="input-label">Target Unit #</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., A-102"
                      value={walkinForm.unitNumber}
                      onChange={(e) => setWalkinForm({ ...walkinForm, unitNumber: e.target.value.toUpperCase() })}
                      className="input-field text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="input-label">Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98XXX XXXXX"
                      value={walkinForm.visitorPhone}
                      onChange={(e) => setWalkinForm({ ...walkinForm, visitorPhone: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="input-label">Purpose</label>
                    <select
                      value={walkinForm.purpose}
                      onChange={(e) => setWalkinForm({ ...walkinForm, purpose: e.target.value })}
                      className="input-field text-xs"
                    >
                      <option value="DELIVERY">Delivery</option>
                      <option value="CAB">Cab</option>
                      <option value="GUEST">Guest</option>
                      <option value="SERVICE">Service</option>
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Vehicle #</label>
                    <input
                      type="text"
                      placeholder="MH-02-AB-0000"
                      value={walkinForm.vehicleNumber}
                      onChange={(e) => setWalkinForm({ ...walkinForm, vehicleNumber: e.target.value })}
                      className="input-field text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingWalkin}
                  className="w-full btn-primary text-xs py-2.5 mt-2 gap-2"
                >
                  <span>{submittingWalkin ? 'Broadcasting to Resident...' : 'Send Live Approval Request'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Active Visitors Inside Society */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Visitors Currently Inside Society</h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                {activeVisitors.length} Active Badges
              </span>
            </div>

            {activeVisitors.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No visitors recorded inside premises.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                    <tr>
                      <th className="px-4 py-3">Pass #</th>
                      <th className="px-4 py-3">Visitor Name</th>
                      <th className="px-4 py-3">Destination Unit</th>
                      <th className="px-4 py-3">Purpose</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Entered At</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeVisitors.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono font-bold text-teal-400">{v.passCode}</td>
                        <td className="px-4 py-3 font-semibold text-slate-200">{v.visitorName}</td>
                        <td className="px-4 py-3 font-bold text-teal-300">{v.apartmentId?.unitNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{v.purpose}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{v.vehicleNumber || 'Walk-in'}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(v.actualEntryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleCheckOut(v._id)}
                            className="btn bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] py-1 px-3 gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check Out</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Daily Help & Domestic Staff Security Section */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Pass Verification & Quick Gate Entry */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <UserCheck className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Daily Help Fast Check-In / Out</h2>
              </div>

              {staffActionMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  {staffActionMsg}
                </div>
              )}

              <form onSubmit={handleVerifyStaff} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Staff Code (e.g., DH-1001) or Phone"
                  value={searchStaffCode}
                  onChange={(e) => setSearchStaffCode(e.target.value.toUpperCase())}
                  className="input-field font-mono uppercase text-xs"
                />
                <button
                  type="submit"
                  disabled={verifyingStaff}
                  className="btn-primary text-xs px-5 shrink-0"
                >
                  <span>{verifyingStaff ? 'Checking...' : 'Find Staff'}</span>
                </button>
              </form>

              {staffVerifyError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{staffVerifyError}</span>
                </div>
              )}

              {verifiedStaff && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/50 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-300 text-sm">{verifiedStaff.passCode}</span>
                    {verifiedStaff.isInside ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Currently Inside
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300">
                        Currently Outside
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Staff Name</span>
                      <p className="font-bold text-slate-100">{verifiedStaff.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Role / Category</span>
                      <p className="font-bold text-teal-300 uppercase">{verifiedStaff.category}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Phone</span>
                      <p className="font-mono text-slate-300">{verifiedStaff.phone}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Vehicle</span>
                      <p className="font-mono text-slate-300">{verifiedStaff.vehicleNumber || 'On Foot'}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                      Registered Apartments:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(verifiedStaff.assignedUnits || []).map((u, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-mono text-[11px]"
                        >
                          Unit {u.apartmentId?.unitNumber || 'Unit'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {verifiedStaff.isInside ? (
                    <button
                      onClick={() => handleCheckOutStaff(verifiedStaff._id)}
                      className="w-full btn bg-rose-600 hover:bg-rose-700 text-white text-xs py-2.5 gap-2 mt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Staff Exit & Open Gate</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckInStaff(verifiedStaff._id)}
                      className="w-full btn-primary text-xs py-2.5 gap-2 mt-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Log Staff Entry & Notify Residents</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Staff Helper Info */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Gate Staff Instructions</h2>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Morning Rush:</strong> Maids, cooks, and drivers enter by quoting their 4-digit code (e.g. <code>DH-1001</code>) or phone number.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Instant Resident Alerts:</strong> When you click Check In, every flat associated with that staff member receives an arrival alert automatically.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Departure Logging:</strong> Staff must tap out or state their code when leaving the premises to ensure accurate perimeter safety.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Active Domestic Staff Currently Inside Premises */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Domestic Staff Inside Premises Right Now</h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                {activeStaffInside.length} Domestic Staff Inside
              </span>
            </div>

            {activeStaffInside.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No domestic staff recorded inside premises.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Staff Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Assigned Units</th>
                      <th className="px-4 py-3">Entered At</th>
                      <th className="px-4 py-3 text-right">Gate Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeStaffInside.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono font-bold text-teal-400">{s.passCode}</td>
                        <td className="px-4 py-3 font-semibold text-slate-200">{s.name}</td>
                        <td className="px-4 py-3 uppercase text-slate-300 font-bold text-[11px]">{s.category}</td>
                        <td className="px-4 py-3 font-mono text-teal-300">
                          {(s.assignedUnits || []).map((u) => u.apartmentId?.unitNumber).filter(Boolean).join(', ') || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {s.lastEntryTime ? new Date(s.lastEntryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleCheckOutStaff(s._id)}
                            className="btn bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] py-1 px-3 gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check Out</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
