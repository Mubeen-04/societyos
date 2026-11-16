import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Shield, Edit2 } from 'lucide-react';

export const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      let url = '/societies/users?limit=100&';
      if (roleFilter) url += `role=${roleFilter}&`;
      if (searchTerm) url += `search=${searchTerm}&`;
      const res = await api.get(url);
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, searchTerm]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/societies/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user role');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Society Resident & Staff Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Role-based access management, resident profiles, security personnel, and vendors
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field sm:w-52"
        >
          <option value="">All Roles</option>
          {user?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
          {user?.role === 'SUPER_ADMIN' && <option value="ADMIN">Admin</option>}
          <option value="CHAIRMAN">Chairman</option>
          <option value="SECRETARY">Secretary</option>
          <option value="TREASURER">Treasurer</option>
          <option value="COMMITTEE_MEMBER">Committee Member</option>
          <option value="RESIDENT">Resident</option>
          <option value="SECURITY">Security Staff</option>
          <option value="VENDOR">Service Vendor</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving member records..." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Assigned Unit</th>
                  <th className="px-5 py-3.5">Role Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-200">
                      {u.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.role}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{u.email}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono">{u.phone}</td>
                    <td className="px-5 py-3.5 font-bold text-teal-300">
                      {u.apartmentId?.unitNumber || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-teal-500"
                      >
                        {u.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN" disabled>Super Admin</option>}
                        {u.role === 'ADMIN' && user?.role !== 'SUPER_ADMIN' && <option value="ADMIN" disabled>Admin</option>}
                        {user?.role === 'SUPER_ADMIN' && <option value="ADMIN">Admin</option>}
                        <option value="CHAIRMAN">Chairman</option>
                        <option value="SECRETARY">Secretary</option>
                        <option value="TREASURER">Treasurer</option>
                        <option value="COMMITTEE_MEMBER">Committee Member</option>
                        <option value="RESIDENT">Resident</option>
                        <option value="SECURITY">Security</option>
                        <option value="VENDOR">Vendor</option>
                      </select>
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
