import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  Users,
  Building,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Activity,
  ShieldCheck,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminOverview = async () => {
      try {
        const res = await api.get('/analytics/overview');
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminOverview();
  }, []);

  const COLORS = ['#14b8a6', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Society Command Center & Executive Overview</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time society operational metrics, financial health, SLA tracking, and building infrastructure
        </p>
      </div>

      {loading || !data ? (
        <LoadingSpinner text="Computing society analytics..." />
      ) : (
        <>
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Residents & Units */}
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Residents</span>
                <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-3">{data.totalResidents || 12}</p>
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Units: {data.totalApartments}</span>
                <span className="text-teal-400 font-semibold">{data.occupancyRate}% Occupied</span>
              </div>
            </div>

            {/* Total Collected */}
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Maintenance Collected</span>
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-3 font-mono">
                ₹{data.financials?.totalCollected?.toLocaleString() || 0}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Pending: ₹{data.financials?.totalPending?.toLocaleString()}</span>
                <span className="text-emerald-400 font-semibold">{data.financials?.collectionRate}% Rate</span>
              </div>
            </div>

            {/* Complaint Resolution SLA */}
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Resolution SLA</span>
                <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-sky-400 mt-3">{data.resolutionRate || 92}%</p>
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Open: {data.openComplaints}</span>
                <span className="text-slate-300">Resolved: {data.resolvedComplaints}</span>
              </div>
            </div>

            {/* Perimeter Security */}
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Perimeter Traffic</span>
                <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-400 mt-3 font-mono">
                {data.visitors?.currentlyInside || 0} Inside
              </p>
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Today's Total: {data.visitors?.visitorsToday || 0}</span>
                <span className="text-teal-400 font-semibold">Gate 1 Live</span>
              </div>
            </div>
          </div>

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Collections Trend */}
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Monthly Revenue & Collections Trend</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Automated collection tracking across all billing cycles</p>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Healthy Cash Flow
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyCollections || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      itemStyle={{ color: '#2dd4bf' }}
                    />
                    <Bar dataKey="amount" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Collected (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Complaints by Category Chart */}
            <div className="glass-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-100">Complaints by Category</h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribution of service requests</p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.complaintsByCategory || [{ category: 'General', count: 1 }]}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={40}
                      paddingAngle={4}
                    >
                      {(data.complaintsByCategory || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-1 text-xs">
                {(data.complaintsByCategory || []).slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      {item.category}
                    </span>
                    <span className="font-semibold text-slate-200">{item.count} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
