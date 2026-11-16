import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  AlertCircle,
  Users,
  ShieldCheck,
  Calendar,
  CreditCard,
  Car,
  Megaphone,
  Building,
  Wrench,
  FileText,
  Activity,
  UserCheck
  , BarChart3
} from 'lucide-react';
import usePermissions from '../../hooks/usePermissions';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;
  const { hasPermission } = usePermissions();

  const getNavLinks = () => {
    switch (role) {
      case 'SECURITY':
        return [
          { name: 'Gate Terminal', path: '/security/terminal', icon: ShieldCheck, requiredPermission: 'MANAGE_VISITORS' },
          { name: 'Community Board', path: '/community', icon: Megaphone }
        ];

      case 'ADMIN':
      case 'SUPER_ADMIN':
        return [
          { name: 'Command Center', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'User Directory', path: '/admin/users', icon: Users, requiredPermission: 'USER_MANAGEMENT' },
          { name: 'Apartment Units', path: '/admin/units', icon: Building, requiredPermission: 'SOCIETY_CONFIGURATION' },
          { name: 'Billing & Invoices', path: '/admin/billing', icon: CreditCard, requiredPermission: 'VIEW_FINANCES' },
          { name: 'Finance Overview', path: '/finance', icon: BarChart3, requiredPermission: 'VIEW_FINANCES' },
          { name: 'Complaints', path: '/resident/complaints', icon: AlertCircle, requiredPermission: 'MANAGE_COMPLAINTS' },
          { name: 'Gate Security', path: '/security/terminal', icon: ShieldCheck, requiredPermission: 'MANAGE_VISITORS' },
          { name: 'Amenities', path: '/resident/amenities', icon: Calendar, requiredPermission: 'MANAGE_AMENITIES' },
          { name: 'Parking Grid', path: '/resident/parking', icon: Car, requiredPermission: 'SOCIETY_CONFIGURATION' },
          { name: 'Community Board', path: '/community', icon: Megaphone },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText, requiredPermission: 'VIEW_AUDIT_LOGS' },
          { name: 'Committee Overview', path: '/committee/dashboard', icon: Activity, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Committee Members', path: '/committee/members', icon: Users, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Meetings', path: '/committee/meetings', icon: Calendar, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Proposals & Voting', path: '/committee/proposals', icon: FileText, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Decisions', path: '/committee/decisions', icon: Activity, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Action Items', path: '/committee/action-items', icon: Wrench, requiredPermission: 'VIEW_ANALYTICS' },
        ];

      case 'CHAIRMAN':
      case 'SECRETARY':
      case 'TREASURER':
      case 'COMMITTEE_MEMBER':
        return [
          { name: 'My Dashboard', path: '/resident/dashboard', icon: LayoutDashboard },
          { name: 'Domestic Staff', path: '/resident/daily-help', icon: UserCheck },
          { name: 'My Complaints', path: '/resident/complaints', icon: AlertCircle },
          { name: 'Visitor Passes', path: '/resident/visitors', icon: ShieldCheck },
          { name: 'Book Amenities', path: '/resident/amenities', icon: Calendar },
          { name: 'Maintenance Bills', path: '/resident/bills', icon: CreditCard },
          { name: 'My Parking', path: '/resident/parking', icon: Car },
          { name: 'Community Board', path: '/community', icon: Megaphone },
          { name: 'Committee Overview', path: '/committee/dashboard', icon: Activity, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Committee Members', path: '/committee/members', icon: Users, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Meetings', path: '/committee/meetings', icon: Calendar, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Proposals & Voting', path: '/committee/proposals', icon: FileText, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Decisions', path: '/committee/decisions', icon: Activity, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Action Items', path: '/committee/action-items', icon: Wrench, requiredPermission: 'VIEW_ANALYTICS' },
          { name: 'Finance Overview', path: '/finance', icon: BarChart3, requiredPermission: 'VIEW_FINANCES' },
          { name: 'Apartment Directory', path: '/admin/units', icon: Building, requiredPermission: 'SOCIETY_CONFIGURATION' },
        ];

      case 'VENDOR':
        return [
          { name: 'Assigned Workload', path: '/vendor/workload', icon: Wrench },
          { name: 'Community Notices', path: '/community', icon: Megaphone }
        ];

      case 'RESIDENT':
      default:
        return [
          { name: 'My Dashboard', path: '/resident/dashboard', icon: LayoutDashboard },
          { name: 'Domestic Staff', path: '/resident/daily-help', icon: UserCheck },
          { name: 'My Complaints', path: '/resident/complaints', icon: AlertCircle },
          { name: 'Visitor Passes', path: '/resident/visitors', icon: ShieldCheck },
          { name: 'Book Amenities', path: '/resident/amenities', icon: Calendar },
          { name: 'Maintenance Bills', path: '/resident/bills', icon: CreditCard },
          { name: 'My Parking', path: '/resident/parking', icon: Car },
          { name: 'Community Board', path: '/community', icon: Megaphone }
        ];
    }
  };

  const links = getNavLinks();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Logo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/25">
          S
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
            SocietyOS
          </span>
        </div>
      </div>

      {/* Role Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation ({role})
        </div>
        {links
          .filter((l) => {
            // If link defines a requiredPermission, enforce it
            if (!l.requiredPermission) return true;
            return hasPermission(l.requiredPermission);
          })
          .map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/15 to-emerald-500/10 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Resident Unit Badge if applicable */}
      {user?.apartment && (
        <div className="p-4 m-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Unit Assignment</p>
          <p className="text-sm font-bold text-slate-200 mt-0.5">
            {user.apartment.unitNumber || user.apartment}
          </p>
          <p className="text-[11px] text-teal-400 font-medium capitalize">{user.occupancyType || 'Resident'}</p>
        </div>
      )}
    </aside>
  );
};
