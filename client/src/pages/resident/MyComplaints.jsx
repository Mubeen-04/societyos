import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AlertCircle,
  PlusCircle,
  Clock,
  CheckCircle2,
  RotateCcw,
  Star,
  Search,
  ArrowRight,
  FileText
} from 'lucide-react';

export const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New complaint form state
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    category: 'PLUMBING',
    priority: 'MEDIUM'
  });
  const [creating, setCreating] = useState(false);

  // Resolution review state
  const [starRating, setStarRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchComplaints = async () => {
    try {
      let url = '/complaints?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (searchTerm) url += `search=${searchTerm}&`;
      const res = await api.get(url);
      if (res.success) {
        setComplaints(res.data);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, searchTerm]);

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/complaints', newComplaint);
      if (res.success) {
        setShowCreateModal(false);
        setNewComplaint({ title: '', description: '', category: 'PLUMBING', priority: 'MEDIUM' });
        fetchComplaints();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit complaint');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      await api.post(`/complaints/${selectedComplaint._id}/feedback`, {
        satisfactionRating: starRating,
        feedbackComments: feedbackNotes
      });
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to close complaint');
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      await api.patch(`/complaints/${selectedComplaint._id}/status`, {
        status: 'REOPENED',
        notes: 'Resident indicated the issue remains unresolved.'
      });
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to reopen complaint');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Complaints & Maintenance Requests</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track status, vendor dispatch timelines, and confirm resolution
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-xs gap-2 py-2.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise New Issue</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by ticket # or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
        </select>
      </div>

      {/* Complaints List Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving complaint records..." />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No complaints filed"
          description="Everything is functioning smoothly! When you report an issue, it will be tracked here with live timelines."
          actionText="Raise New Issue"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">Ticket #</th>
                  <th className="px-5 py-3.5">Issue Summary</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Reported</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {complaints.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => setSelectedComplaint(c)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-teal-400">
                      {c.ticketNumber}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-200 max-w-xs truncate">
                      {c.title}
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-medium">
                      {c.category}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={c.priority}>{c.priority}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={c.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1">
                        Details <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Raise New Complaint */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register Maintenance Issue"
      >
        <form onSubmit={handleCreateComplaint} className="space-y-4">
          <div>
            <label className="input-label">Issue Title</label>
            <input
              type="text"
              required
              placeholder="e.g., Water leakage in bathroom pipe"
              value={newComplaint.title}
              onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Category</label>
              <select
                value={newComplaint.category}
                onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                className="input-field"
              >
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="LIFT">Lift</option>
                <option value="CLEANING">Cleaning</option>
                <option value="SECURITY">Security</option>
                <option value="PARKING">Parking</option>
                <option value="WATER">Water</option>
                <option value="NOISE">Noise</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="input-label">Priority</label>
              <select
                value={newComplaint.priority}
                onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value })}
                className="input-field"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency (SLA 2 hrs)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Detailed Description</label>
            <textarea
              required
              rows={4}
              placeholder="Describe what is occurring, exact location in your apartment, and timing..."
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              className="input-field"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary text-xs gap-2"
            >
              <span>{creating ? 'Submitting...' : 'File Ticket'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complaint Detail & Immutable Timeline */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title={`Ticket ${selectedComplaint?.ticketNumber}`}
        maxWidth="max-w-2xl"
      >
        {selectedComplaint && (
          <div className="space-y-6">
            {/* Header badges */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h4 className="text-base font-bold text-slate-100">{selectedComplaint.title}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Reported on {new Date(selectedComplaint.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedComplaint.priority}>{selectedComplaint.priority}</Badge>
                <Badge status={selectedComplaint.status} />
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Description</p>
              <p className="text-xs text-slate-200 leading-relaxed">{selectedComplaint.description}</p>
              {selectedComplaint.assignedVendorId && (
                <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assigned Vendor:</span>
                  <span className="font-semibold text-teal-300">
                    {selectedComplaint.assignedVendorId.companyName} ({selectedComplaint.assignedVendorId.contactPerson})
                  </span>
                </div>
              )}
            </div>

            {/* Immutable Timeline */}
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Audit Activity Timeline</span>
              </p>

              <div className="relative pl-6 space-y-4 border-l-2 border-slate-700/80">
                {selectedComplaint.timeline?.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-teal-400"></span>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">{item.action}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.notes}</p>
                    <span className="text-[10px] text-teal-400 font-medium">By {item.actorName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resident Closure / Reopen Workflow */}
            {selectedComplaint.status === 'RESOLVED' && (
              <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-emerald-300">Issue Marked Resolved by Management</h5>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Please test the repair. If satisfied, rate the service to close the ticket. If unresolved, you may reopen it.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStarRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-5 h-5 ${star <= starRating ? 'fill-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Optional review or feedback comments..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="input-field text-xs"
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleReopen}
                    disabled={updating}
                    className="btn bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Ticket</span>
                  </button>

                  <button
                    onClick={handleConfirmClose}
                    disabled={updating}
                    className="btn-primary text-xs gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Close</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
