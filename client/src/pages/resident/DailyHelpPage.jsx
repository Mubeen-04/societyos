import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  UserCheck,
  Users,
  Star,
  Clock,
  Phone,
  ShieldCheck,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'MAID', label: 'Maids / Housekeeping' },
  { value: 'COOK', label: 'Cooks / Chefs' },
  { value: 'DRIVER', label: 'Personal Drivers' },
  { value: 'CLEANER', label: 'Deep Cleaners' },
  { value: 'BABYSITTER', label: 'Nannies / Babysitters' },
  { value: 'GARDENER', label: 'Gardeners' },
  { value: 'OTHER', label: 'Other Staff' }
];

export const DailyHelpPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my_staff'); // 'my_staff' | 'directory'
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [insideOnly, setInsideOnly] = useState(false);

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDetails, setStaffDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Review state
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // New staff form state
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    phone: '',
    category: 'MAID',
    vehicleNumber: '',
    idNumber: '',
    notes: '',
    assignToMyApartment: true
  });
  const [registering, setRegistering] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (insideOnly) params.isInside = 'true';

      const res = await api.get('/daily-help', { params });
      if (res.success) {
        setStaffList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load domestic staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedCategory, searchQuery, insideOnly]);

  // Open Details Modal and fetch logs & reviews
  const handleOpenDetails = async (staff) => {
    setSelectedStaff(staff);
    setLoadingDetails(true);
    setRatingInput(5);
    setCommentInput('');
    try {
      const res = await api.get(`/daily-help/${staff._id}`);
      if (res.success) {
        setStaffDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load staff details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Assign staff to current resident's flat
  const handleAssignToMyFlat = async (staffId) => {
    try {
      const res = await api.post(`/daily-help/${staffId}/assign`);
      if (res.success) {
        fetchStaff();
        if (selectedStaff && selectedStaff._id === staffId) {
          handleOpenDetails(selectedStaff);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to link staff member');
    }
  };

  // Remove staff from current resident's flat
  const handleRemoveFromMyFlat = async (staffId) => {
    if (!window.confirm('Remove this staff member from your household list?')) return;
    try {
      const res = await api.delete(`/daily-help/${staffId}/assign`);
      if (res.success) {
        fetchStaff();
        if (selectedStaff && selectedStaff._id === staffId) {
          handleOpenDetails(selectedStaff);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to remove staff member');
    }
  };

  // Submit Rating & Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setSubmittingReview(true);
    try {
      const res = await api.post(`/daily-help/${selectedStaff._id}/reviews`, {
        rating: ratingInput,
        comment: commentInput
      });
      if (res.success) {
        setCommentInput('');
        handleOpenDetails(selectedStaff);
        fetchStaff();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Register New Staff
  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const payload = {
        name: newStaffForm.name,
        phone: newStaffForm.phone,
        category: newStaffForm.category,
        vehicleNumber: newStaffForm.vehicleNumber,
        idProof: { idType: 'AADHAAR', idNumber: newStaffForm.idNumber },
        notes: newStaffForm.notes,
        assignToMyApartment: newStaffForm.assignToMyApartment
      };
      const res = await api.post('/daily-help', payload);
      if (res.success) {
        setShowRegisterModal(false);
        setNewStaffForm({
          name: '',
          phone: '',
          category: 'MAID',
          vehicleNumber: '',
          idNumber: '',
          notes: '',
          assignToMyApartment: true
        });
        fetchStaff();
        alert(`Registered ${res.data.name} with Gate Pass Code: ${res.data.passCode}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to register staff');
    } finally {
      setRegistering(false);
    }
  };

  // Filter staff working in the resident's unit
  const myApartmentId = user?.apartment?._id || user?.apartment;
  const myHouseholdStaff = staffList.filter((s) =>
    (s.assignedUnits || []).some(
      (u) =>
        (u.apartmentId?._id || u.apartmentId)?.toString() === myApartmentId?.toString() ||
        (u.residentId?._id || u.residentId)?.toString() === user?._id?.toString()
    )
  );

  const currentlyInsideCount = staffList.filter((s) => s.isInside).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Gate & Household Staff</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Daily Help & Domestic Staff</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Know in real-time when your maid or cook arrives, discover trusted staff, and read resident ratings.
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="btn-primary text-xs gap-2 py-2.5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Staff</span>
        </button>
      </div>

      {/* Top Presence & Quick Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">My Household Staff</span>
          <p className="text-2xl font-bold text-teal-300 mt-2 font-mono">{myHouseholdStaff.length}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Assigned to your apartment</span>
        </div>
        <div className="stat-card border-emerald-500/30 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Inside Society Now</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{currentlyInsideCount}</p>
          <span className="text-[10px] text-emerald-400/80 block mt-1">Checked in at main gate</span>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">Total Society Staff</span>
          <p className="text-2xl font-bold text-slate-200 mt-2 font-mono">{staffList.length}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Verified with pass codes</span>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold text-slate-400">Top Rated Staff</span>
          <p className="text-2xl font-bold text-amber-400 mt-2 font-mono flex items-center gap-1.5">
            <Star className="w-5 h-5 fill-amber-400" />
            <span>4.9 Avg</span>
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">Resident verified reviews</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('my_staff')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'my_staff'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          My Household Staff ({myHouseholdStaff.length})
        </button>
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'directory'
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Society Staff Directory ({staffList.length})
        </button>
      </div>

      {/* Tab 1: My Household Staff */}
      {activeTab === 'my_staff' && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSpinner text="Retrieving your household staff..." />
          ) : myHouseholdStaff.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No domestic staff linked to your apartment yet"
              description="Link your maid, cook, driver, or cleaner to get live gate alerts when they enter the society."
              actionText="Browse Society Directory"
              onAction={() => setActiveTab('directory')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myHouseholdStaff.map((staff) => (
                <div
                  key={staff._id}
                  className="glass-card-hover p-5 flex flex-col justify-between border-slate-700/60"
                >
                  <div className="space-y-3">
                    {/* Header line: Pass Code + Live Inside Status */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        {staff.passCode}
                      </span>
                      {staff.isInside ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          Inside Premises
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Not in Society
                        </span>
                      )}
                    </div>

                    {/* Name & Role */}
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{staff.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-slate-300 uppercase px-2 py-0.5 rounded bg-slate-800">
                          {staff.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{staff.rating > 0 ? staff.rating.toFixed(1) : 'New'}</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({staff.reviewCount})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Today's Arrival:</span>
                        <span className="font-medium text-slate-200">
                          {staff.lastEntryTime
                            ? new Date(staff.lastEntryTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Not entered today'}
                        </span>
                      </div>
                      {staff.lastExitTime && !staff.isInside && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Last Departure:</span>
                          <span className="font-medium text-slate-400">
                            {new Date(staff.lastExitTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                        <span className="text-slate-500">Contact:</span>
                        <a
                          href={`tel:${staff.phone}`}
                          className="font-mono text-teal-300 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{staff.phone}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenDetails(staff)}
                      className="btn-primary flex-1 text-xs py-2"
                    >
                      View & Rate (★)
                    </button>
                    <button
                      onClick={() => handleRemoveFromMyFlat(staff._id)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700/80"
                      title="Unlink from my flat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Society Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or pass code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>

              {/* Role Filter & Checkbox */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field text-xs py-2 w-auto"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={insideOnly}
                    onChange={(e) => setInsideOnly(e.target.checked)}
                    className="rounded border-slate-600 text-teal-500 focus:ring-teal-400"
                  />
                  <span>Inside Premises Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Directory Grid */}
          {loading ? (
            <LoadingSpinner text="Searching staff directory..." />
          ) : staffList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No domestic staff found"
              description="Try adjusting your search criteria or register a new staff member."
              actionText="Register New Staff"
              onAction={() => setShowRegisterModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((staff) => {
                const isWorkingInMyFlat = (staff.assignedUnits || []).some(
                  (u) =>
                    (u.apartmentId?._id || u.apartmentId)?.toString() === myApartmentId?.toString() ||
                    (u.residentId?._id || u.residentId)?.toString() === user?._id?.toString()
                );

                return (
                  <div
                    key={staff._id}
                    className="glass-card-hover p-5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header line */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          {staff.passCode}
                        </span>
                        {staff.isInside ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Inside
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            Away
                          </span>
                        )}
                      </div>

                      {/* Name & Role */}
                      <div>
                        <h3 className="text-base font-bold text-slate-100">{staff.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-300 uppercase px-2 py-0.5 rounded bg-slate-800">
                            {staff.category}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{staff.rating > 0 ? staff.rating.toFixed(1) : 'New'}</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              ({staff.reviewCount})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Units List */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                          Works in Apartments:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(staff.assignedUnits || []).length === 0 ? (
                            <span className="text-xs text-slate-500">Currently available for hire</span>
                          ) : (
                            staff.assignedUnits.map((u, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700"
                              >
                                {u.apartmentId?.unitNumber || 'Unit'}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-400">
                        <span>Phone:</span>
                        <span className="font-mono text-slate-200">{staff.phone}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                      <button
                        onClick={() => handleOpenDetails(staff)}
                        className="btn-secondary flex-1 text-xs py-2"
                      >
                        Profile & Reviews
                      </button>
                      {isWorkingInMyFlat ? (
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hired</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAssignToMyFlat(staff._id)}
                          className="btn-primary text-xs py-2 px-3 shrink-0"
                          title="Add to my apartment"
                        >
                          + Hire
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Staff Profile & Resident Reviews */}
      <Modal
        isOpen={!!selectedStaff}
        onClose={() => {
          setSelectedStaff(null);
          setStaffDetails(null);
        }}
        title="Domestic Staff Profile & Ledger"
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* Top Identity Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded">
                  {selectedStaff.passCode}
                </span>
                <h2 className="text-lg font-bold text-slate-100 mt-1">{selectedStaff.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="uppercase font-semibold text-slate-300">{selectedStaff.category}</span>
                  <span>•</span>
                  <a href={`tel:${selectedStaff.phone}`} className="font-mono text-teal-300 hover:underline">
                    {selectedStaff.phone}
                  </a>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-base font-bold text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <span>{selectedStaff.rating > 0 ? selectedStaff.rating.toFixed(1) : 'New'}</span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {selectedStaff.reviewCount} resident {selectedStaff.reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>

            {/* Attendance & Gate Status */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Presence Status:</span>
                {selectedStaff.isInside ? (
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Inside Society (Entered Gate 1)
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Outside Premises</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last Entry Time:</span>
                <span className="font-mono text-slate-200">
                  {selectedStaff.lastEntryTime
                    ? new Date(selectedStaff.lastEntryTime).toLocaleString()
                    : 'No entry logged'}
                </span>
              </div>
              {selectedStaff.vehicleNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Registered Vehicle:</span>
                  <span className="font-mono text-teal-300">{selectedStaff.vehicleNumber}</span>
                </div>
              )}
            </div>

            {/* Recent Gate Entry Logs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Recent Gate Activity (Last 5 Logs)</span>
              </h4>
              {loadingDetails ? (
                <LoadingSpinner text="Retrieving attendance..." />
              ) : (staffDetails?.recentLogs || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-lg">
                  No gate entries recorded yet for this staff member.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {staffDetails.recentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log._id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">
                          {new Date(log.entryTime).toLocaleDateString()}
                        </span>
                        <span className="text-slate-500 text-[11px] ml-2">via {log.gateNumber}</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-emerald-400">
                          In: {new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {log.exitTime && (
                          <span className="text-slate-400 ml-2">
                            Out: {new Date(log.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resident Reviews */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Resident Reviews & Feedback</span>
              </h4>

              {/* Review Form */}
              <form onSubmit={handleSubmitReview} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Rate this staff member:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRatingInput(s)}
                        className="p-1 focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            s <= ratingInput ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-400 ml-1">{ratingInput}.0</span>
                  </div>
                </div>

                <textarea
                  rows="2"
                  placeholder="Share your experience (e.g., punctuality, cooking quality, honesty)..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="input-field text-xs resize-none"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    <span>{submittingReview ? 'Submitting...' : 'Post Review'}</span>
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(staffDetails?.staff?.reviews || selectedStaff?.reviews || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-3">
                    No resident reviews yet. Be the first to review!
                  </p>
                ) : (
                  (staffDetails?.staff?.reviews || selectedStaff?.reviews || []).map((rev, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {rev.residentId?.name || 'Resident'}
                          </span>
                          {rev.apartmentId?.unitNumber && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-300">
                              Unit {rev.apartmentId.unitNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{rev.comment}</p>
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: Register New Staff */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register New Domestic Staff"
      >
        <form onSubmit={handleRegisterStaff} className="space-y-4">
          <div>
            <label className="input-label">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Anita Shinde"
              value={newStaffForm.name}
              onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
              className="input-field text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                required
                placeholder="+91 98XXX XXXXX"
                value={newStaffForm.phone}
                onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="input-label">Role / Category</label>
              <select
                value={newStaffForm.category}
                onChange={(e) => setNewStaffForm({ ...newStaffForm, category: e.target.value })}
                className="input-field text-xs"
              >
                <option value="MAID">Maid / Housekeeper</option>
                <option value="COOK">Cook / Chef</option>
                <option value="DRIVER">Driver</option>
                <option value="CLEANER">Deep Cleaner</option>
                <option value="BABYSITTER">Babysitter / Nanny</option>
                <option value="GARDENER">Gardener</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Vehicle Registration (Optional)</label>
              <input
                type="text"
                placeholder="e.g. MH-02-AB-1234"
                value={newStaffForm.vehicleNumber}
                onChange={(e) => setNewStaffForm({ ...newStaffForm, vehicleNumber: e.target.value.toUpperCase() })}
                className="input-field text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="input-label">Aadhaar / ID Number</label>
              <input
                type="text"
                placeholder="e.g. XXXX-XXXX-1234"
                value={newStaffForm.idNumber}
                onChange={(e) => setNewStaffForm({ ...newStaffForm, idNumber: e.target.value })}
                className="input-field text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Special Notes / Specialization</label>
            <input
              type="text"
              placeholder="e.g. North Indian cooking, infant care certification, etc."
              value={newStaffForm.notes}
              onChange={(e) => setNewStaffForm({ ...newStaffForm, notes: e.target.value })}
              className="input-field text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newStaffForm.assignToMyApartment}
              onChange={(e) => setNewStaffForm({ ...newStaffForm, assignToMyApartment: e.target.checked })}
              className="rounded border-slate-600 text-teal-500 focus:ring-teal-400"
            />
            <span>Link to my apartment household staff immediately</span>
          </label>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registering}
              className="btn-primary text-xs"
            >
              <span>{registering ? 'Registering...' : 'Create & Generate Pass Code'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
