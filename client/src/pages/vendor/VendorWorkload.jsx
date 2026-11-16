import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { Wrench, CheckCircle2, Play, AlertCircle, Clock } from 'lucide-react';

export const VendorWorkload = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [workNotes, setWorkNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchWorkload = async () => {
    try {
      const res = await api.get('/complaints');
      if (res.success) setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkload();
  }, []);

  const handleUpdateStatus = async (status) => {
    if (!selectedJob) return;
    setUpdating(true);
    try {
      await api.patch(`/complaints/${selectedJob._id}/status`, {
        status,
        notes: workNotes || `Technician transitioned job to ${status}`
      });
      setSelectedJob(null);
      setWorkNotes('');
      fetchWorkload();
    } catch (err) {
      alert(err.message || 'Failed to update work status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Vendor Service Terminal & Job Dispatch</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Review assigned maintenance tickets, update repair stages, and file completion notes
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving assigned tickets..." />
      ) : complaints.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-12 glass-card">
          No service requests currently assigned.
        </p>
      ) : (
        <div className="space-y-4">
          {complaints.map((job) => (
            <div
              key={job._id}
              className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-600 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-teal-400">{job.ticketNumber}</span>
                  <Badge variant={job.priority}>{job.priority}</Badge>
                  <Badge status={job.status} />
                  <span className="text-xs font-bold text-slate-200">
                    Unit: {job.apartmentId?.unitNumber}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{job.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{job.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="btn-primary text-xs gap-1.5 py-2"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Update Work Status</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Update Job Status */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={`Work Update: ${selectedJob?.ticketNumber}`}
      >
        {selectedJob && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Apartment:</p>
              <p className="text-sm font-bold text-slate-100">{selectedJob.apartmentId?.unitNumber}</p>
            </div>

            <div>
              <label className="input-label">Technician Work Notes</label>
              <textarea
                rows={3}
                placeholder="Details of parts replaced, diagnostics, and testing..."
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                className="input-field text-xs"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={updating}
                className="btn bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs py-2.5 gap-2"
              >
                <Play className="w-4 h-4" />
                <span>Mark In Progress</span>
              </button>

              <button
                onClick={() => handleUpdateStatus('RESOLVED')}
                disabled={updating}
                className="btn-primary text-xs py-2.5 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
