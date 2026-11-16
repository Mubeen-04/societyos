import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ShieldCheck,
  PlusCircle,
  QrCode,
  Share2,
  Calendar,
  Car,
  Clock,
  User,
  Phone,
  Copy,
  Check
} from 'lucide-react';

export const MyVisitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreApproveModal, setShowPreApproveModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [copied, setCopied] = useState(false);

  // Pre-approve form state
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    purpose: 'GUEST',
    vehicleNumber: '',
    visitorCount: 1,
    validUntil: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = async () => {
    try {
      const res = await api.get('/visitors');
      if (res.success) {
        setVisitors(res.data);
      }
    } catch (err) {
      console.error('Error fetching visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handlePreApprove = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/visitors/pre-approve', formData);
      if (res.success) {
        setShowPreApproveModal(false);
        setSelectedPass(res.data);
        setFormData({
          visitorName: '',
          visitorPhone: '',
          purpose: 'GUEST',
          vehicleNumber: '',
          visitorCount: 1,
          validUntil: ''
        });
        fetchVisitors();
      }
    } catch (err) {
      alert(err.message || 'Failed to pre-approve visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDecision = async (id, decision) => {
    try {
      const res = await api.patch(`/visitors/${id}/decision`, { decision });
      if (res.success) {
        fetchVisitors();
        if (selectedPass && selectedPass._id === id) {
          setSelectedPass(res.data);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to update visitor decision');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Visitor Passes & Gate Access</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue instant pre-approved digital passes or review walk-in approvals
          </p>
        </div>
        <button
          onClick={() => setShowPreApproveModal(true)}
          className="btn-primary text-xs gap-2 py-2.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Pre-Approve Visitor</span>
        </button>
      </div>

      {/* Visitors List */}
      {loading ? (
        <LoadingSpinner text="Loading visitor logs..." />
      ) : visitors.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No visitor passes registered"
          description="Pre-approving visitors allows fast, contactless entry through the gate without waiting for approvals."
          actionText="Generate Visitor Pass"
          onAction={() => setShowPreApproveModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visitors.map((v) => (
            <div
              key={v._id}
              onClick={() => setSelectedPass(v)}
              className="glass-card-hover p-5 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-teal-400 tracking-wider">
                    {v.passCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={v.approvalStatus}>{v.approvalStatus}</Badge>
                    <Badge variant={v.entryStatus}>{v.entryStatus}</Badge>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100 mt-3">{v.visitorName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{v.visitorPhone}</p>

                <div className="mt-4 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Purpose</span>
                    <p className="text-slate-300 font-medium">{v.purpose}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Vehicle</span>
                    <p className="text-slate-300 font-medium font-mono">{v.vehicleNumber || 'None'}</p>
                  </div>
                </div>
              </div>

              {v.approvalStatus === 'PENDING' && (
                <div className="mt-3 pt-3 border-t border-amber-500/30 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDecision(v._id, 'REJECTED')}
                    className="btn-danger flex-1 text-[11px] py-1.5"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleDecision(v._id, 'APPROVED')}
                    className="btn-primary flex-1 text-[11px] py-1.5"
                  >
                    Approve
                  </button>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                <span>Valid: {new Date(v.validUntil).toLocaleDateString()}</span>
                <span className="text-teal-400 font-semibold inline-flex items-center gap-1">
                  View Pass <QrCode className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Pre-Approve Visitor */}
      <Modal
        isOpen={showPreApproveModal}
        onClose={() => setShowPreApproveModal(false)}
        title="Generate Pre-Approved Visitor Pass"
      >
        <form onSubmit={handlePreApprove} className="space-y-4">
          <div>
            <label className="input-label">Visitor Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Rahul Sharma"
              value={formData.visitorName}
              onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label">Phone Number</label>
            <input
              type="tel"
              required
              placeholder="+91 98XXX XXXXX"
              value={formData.visitorPhone}
              onChange={(e) => setFormData({ ...formData, visitorPhone: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Purpose</label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="input-field"
              >
                <option value="GUEST">Guest / Relative</option>
                <option value="DELIVERY">Delivery</option>
                <option value="CAB">Cab / Taxi</option>
                <option value="SERVICE">Home Service</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="input-label">Visitor Count</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.visitorCount}
                onChange={(e) => setFormData({ ...formData, visitorCount: parseInt(e.target.value) || 1 })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Vehicle Registration (Optional)</label>
            <input
              type="text"
              placeholder="e.g., MH-02-AB-1234"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              className="input-field font-mono uppercase"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowPreApproveModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs gap-2"
            >
              <span>{submitting ? 'Generating Pass...' : 'Create Pass'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Digital Visitor Pass Card with QR */}
      <Modal
        isOpen={!!selectedPass}
        onClose={() => setSelectedPass(null)}
        title="Digital Visitor Pass"
      >
        {selectedPass && (
          <div className="space-y-6">
            {/* Styled Pass Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-teal-500/40 p-6 shadow-2xl text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Visitor Entry Pass</span>
              </div>

              {/* QR Code Box (SVG matrix emulation) */}
              <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl shadow-md flex flex-col items-center justify-center">
                <div className="grid grid-cols-6 gap-1 w-36 h-36">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        i % 2 === 0 || i % 5 === 0 || i === 0 || i === 5 || i === 30 || i === 35
                          ? 'bg-slate-900'
                          : 'bg-slate-300'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Pass Code Badge */}
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-extrabold text-xl text-teal-400 tracking-widest">
                  {selectedPass.passCode}
                </span>
                <button
                  onClick={() => copyPassCode(selectedPass.passCode)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Copy Pass Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Details table */}
              <div className="bg-slate-950/60 rounded-xl p-4 text-xs text-left space-y-2 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Visitor:</span>
                  <span className="font-semibold text-slate-100">{selectedPass.visitorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Purpose:</span>
                  <span className="font-medium text-slate-200">{selectedPass.purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-semibold text-teal-300">Unit {selectedPass.apartmentId?.unitNumber || 'A-102'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="font-mono text-slate-200">{selectedPass.vehicleNumber || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500">Pass Validity:</span>
                  <span className="text-slate-400 font-mono">
                    {new Date(selectedPass.validUntil).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Present this QR code or pass code to security guard at Society Gate 1.
              </p>

              {selectedPass.approvalStatus === 'PENDING' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleDecision(selectedPass._id, 'REJECTED')}
                    className="btn-danger flex-1 text-xs py-2"
                  >
                    Decline Entry
                  </button>
                  <button
                    onClick={() => handleDecision(selectedPass._id, 'APPROVED')}
                    className="btn-primary flex-1 text-xs py-2"
                  >
                    Approve Entry
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
