import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CreditCard, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const MaintenanceBills = () => {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paying, setPaying] = useState(false);
  const outstanding = (invoice) => Math.max(0, Number(invoice?.balanceAmount ?? (invoice?.payableAmount || 0) - (invoice?.amountPaid || 0)));

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/billing/invoices');
      if (res.success) {
        setInvoices(res.data);
      }
      const paymentResponse = await api.get('/billing/payments');
      setPayments(paymentResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv);
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice) return;
    setPaying(true);
    try {
      const res = await api.post(`/billing/invoices/${selectedInvoice._id}/pay`);
      if (!res.data?.checkoutUrl) throw new Error('Stripe Checkout link was not returned.');
      window.location.assign(res.data.checkoutUrl);
    } catch (err) {
      alert(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Society Maintenance Billing & Invoices</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          View outstanding balances, pay securely through Stripe Checkout, and retrieve verified receipts.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving maintenance ledger..." />
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const isPaid = inv.status === 'PAID' || outstanding(inv) <= 0;
            return (
              <div
                key={inv._id}
                className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-600 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-teal-400">
                      {inv.invoiceNumber}
                    </span>
                    <Badge variant={inv.status}>{inv.status}</Badge>
                    <span className="text-xs font-semibold text-slate-300">
                      Month: {inv.billingMonth}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                    {inv.items?.map((item, i) => (
                      <div key={i}>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block truncate">
                          {item.title}
                        </span>
                        <span className="font-semibold text-slate-200">
                          ₹{item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 md:border-l md:border-slate-800 md:pl-6 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Payable</span>
                    <span className="text-xl font-extrabold text-slate-100">
                      ₹{inv.payableAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Paid ₹{Number(inv.amountPaid || (isPaid ? inv.payableAmount : 0)).toLocaleString()} · Outstanding ₹{outstanding(inv).toLocaleString()}</span>
                    {inv.lateFee > 0 && (
                      <span className="text-[10px] text-rose-400 block font-medium">
                        Includes ₹{inv.lateFee} Late Fine
                      </span>
                    )}
                  </div>

                  {isPaid ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Settled</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenPayment(inv)}
                      className="btn-primary text-xs gap-2 py-2.5 px-5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹{outstanding(inv).toLocaleString()}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-100">Payment history</h2>
        {payments.length ? <div className="divide-y divide-slate-800">{payments.map((payment) => <div key={payment._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"><div><p className="font-mono text-slate-200">{payment.transactionRef}</p><p className="text-slate-500 mt-1">{payment.invoiceId?.billingMonth || 'Maintenance'} · {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><Badge status={payment.status}>{payment.status}</Badge><strong className="text-emerald-300">₹{Number(payment.amount).toLocaleString()}</strong>{payment.status === 'SUCCESS' && <a className="text-teal-300" href={`/payment/receipt/${payment._id}`}>Receipt</a>}</div></div>)}</div> : <p className="text-xs text-slate-500">No payments recorded yet.</p>}
      </section>

      {/* Redirect to hosted Stripe Checkout after server validation. */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Secure Stripe Checkout"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-mono text-slate-200">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Billing Cycle:</span>
                <span className="text-slate-200 font-medium">{selectedInvoice.billingMonth}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Outstanding:</span>
                <span className="text-emerald-300 font-semibold">₹{outstanding(selectedInvoice).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-700/60">
                <span className="text-slate-100">Payable Amount:</span>
                <span className="text-teal-400 font-mono text-base">
                  ₹{selectedInvoice.payableAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Card details are entered on Stripe Checkout. The bill is marked paid only after a signed webhook confirmation.</span>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={paying}
                className="btn-primary text-xs gap-2"
              >
                <span>{paying ? 'Opening Stripe…' : `Continue to pay ₹${outstanding(selectedInvoice)}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Payment Receipt */}
      <Modal
        isOpen={!!receiptData}
        onClose={() => setReceiptData(null)}
        title="Payment Receipt"
      >
        {receiptData && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Payment Successful</h3>
            <p className="text-xs text-slate-400">
              Your society maintenance dues have been settled in the master ledger.
            </p>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt #:</span>
                <span className="text-teal-300 font-bold">{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Ref:</span>
                <span className="text-slate-200">{receiptData.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="text-emerald-400 font-bold">₹{receiptData.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-slate-200">{receiptData.paymentMethod}</span>
              </div>
            </div>

            <button
              onClick={() => setReceiptData(null)}
              className="w-full btn-primary text-xs py-2.5"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
