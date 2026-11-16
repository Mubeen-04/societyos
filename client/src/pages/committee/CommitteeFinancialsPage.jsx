import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CommitteePageHeader, GovernanceStat, InlineError } from '../../components/committee/CommitteeComponents';

const money = (amount, society) => new Intl.NumberFormat(undefined, { style: 'currency', currency: society?.settings?.currency || 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export const CommitteeFinancialsPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/analytics/overview').then((response) => setData(response.data)).catch((err) => setError(err.message || 'Unable to load society financials.')).finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner text="Loading society financials..." />;
  return <div className="space-y-6 animate-fade-in"><CommitteePageHeader title="Financial summary" description="Society level billing and collection information for governance review." /><InlineError>{error}</InlineError>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <GovernanceStat label="Total billed" value={money(data?.financials?.totalBilled)} hint="Current society invoice ledger" />
      <GovernanceStat label="Collected" value={money(data?.financials?.totalCollected)} hint={`${data?.financials?.collectionRate ?? 0}% collection rate`} />
      <GovernanceStat label="Outstanding" value={money(data?.financials?.totalPending)} hint="Invoices not marked paid" />
      <GovernanceStat label="Open operational requests" value={data?.openComplaints ?? 0} hint={`${data?.resolutionRate ?? 0}% complaint resolution rate`} />
    </div>
    <section className="glass-card p-5"><h2 className="font-bold text-slate-100">Monthly collections</h2>{data?.monthlyCollections?.length ? <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{data.monthlyCollections.map((month) => <div key={month.month} className="p-4 rounded-xl bg-slate-800/60 flex items-center justify-between"><span className="text-sm text-slate-300">{month.month}</span><span className="font-bold text-emerald-300">{money(month.amount)}</span></div>)}</div> : <p className="text-sm text-slate-500 mt-3">No completed invoice collections yet.</p>}</section>
  </div>;
};
