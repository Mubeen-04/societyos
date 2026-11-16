import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FileText, ShieldAlert, Clock, User } from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit-logs?limit=50');
        if (res.success) setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">System Audit Trail & Security Logs</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Immutable forensic log of sensitive administrative, billing, and status transitions
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Reading immutable audit store..." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Action Executed</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Entity ID</th>
                  <th className="px-5 py-3.5">Audit Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-200">{log.userName}</p>
                      <span className="text-[10px] text-teal-400 font-medium">{log.userRole}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-teal-300 font-bold">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-medium">{log.entity}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">{log.entityId}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                      {log.newState ? JSON.stringify(log.newState) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
