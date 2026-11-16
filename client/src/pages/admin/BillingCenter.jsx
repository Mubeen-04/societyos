import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CreditCard, PlusCircle, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export const BillingCenter = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);

  const [batchForm, setBatchForm] = useState({
    billingMonth: '2026-10',
    dueDate: '2026-10-15',
    baseMaintenance: 4000,
    waterCharges: 300,
    parkingCharges: 500
  });

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/billing/invoices?limit=100');
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleGenerateBatch = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await api.post('/billing/generate-monthly', batchForm);
      if (res.success) {
        setGenerateResult(res.message);
        fetchInvoices();
      }
    } catch (err) {
      alert(err.message || 'Failed to generate batch invoices');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Maintenance Invoicing & Billing Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Batch monthly invoice generation for all 112 units and collection reconciliation
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn-primary text-xs gap-2 py-2.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Generate Monthly Invoices</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading society billing ledger..." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Unit #</th>
                  <th className="px-5 py-3.5">Resident</th>
                  <th className="px-5 py-3.5">Cycle</th>
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-teal-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-100">
                      {inv.apartmentId?.unitNumber}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{inv.residentId?.name}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono">{inv.billingMonth}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-200 font-mono">
                      ₹{inv.payableAmount?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={inv.status}>{inv.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Batch Generate Invoices */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Batch Generate Society Monthly Invoices"
      >
        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <p className="text-xs text-slate-400">
            This will calculate dues and dispatch in-app invoices to all occupied apartment units for the specified cycle.
          </p>

          {generateResult && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              {generateResult}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Billing Cycle (YYYY-MM)</label>
              <input
                type="text"
                required
                value={batchForm.billingMonth}
                onChange={(e) => setBatchForm({ ...batchForm, billingMonth: e.target.value })}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label className="input-label">Due Date</label>
              <input
                type="date"
                required
                value={batchForm.dueDate}
                onChange={(e) => setBatchForm({ ...batchForm, dueDate: e.target.value })}
                className="input-field font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="input-label">Base Fee (₹)</label>
              <input
                type="number"
                value={batchForm.baseMaintenance}
                onChange={(e) => setBatchForm({ ...batchForm, baseMaintenance: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Water Fee (₹)</label>
              <input
                type="number"
                value={batchForm.waterCharges}
                onChange={(e) => setBatchForm({ ...batchForm, waterCharges: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Parking Fee (₹)</label>
              <input
                type="number"
                value={batchForm.parkingCharges}
                onChange={(e) => setBatchForm({ ...batchForm, parkingCharges: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="btn-secondary text-xs"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={generating}
              className="btn-primary text-xs gap-2"
            >
              <span>{generating ? 'Processing Batch...' : 'Generate Invoices'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
