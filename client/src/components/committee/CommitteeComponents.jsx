import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, Users } from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

export const roleLabel = (role = '') => ({
  CHAIRMAN: 'Chairman', SECRETARY: 'Secretary', TREASURER: 'Treasurer', COMMITTEE_MEMBER: 'Committee Member'
}[role] || role.replaceAll('_', ' '));

export const dateLabel = (date, options = { dateStyle: 'medium' }) => date ? new Date(date).toLocaleDateString(undefined, options) : 'Not set';
export const dateTimeLabel = (date) => date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';

export const CommitteePageHeader = ({ eyebrow = 'SOCIETY GOVERNANCE', title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-teal-400">{eyebrow}</p>
      <h1 className="text-2xl font-bold text-slate-100 mt-1">{title}</h1>
      <p className="text-sm text-slate-400 mt-1">{description}</p>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const GovernanceStat = ({ label, value, hint, icon: Icon = ClipboardList, to }) => {
  const body = <div className="stat-card h-full">
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <p className="text-3xl font-bold text-slate-100 mt-2">{value ?? 0}</p>
      </div>
      <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-300"><Icon className="w-5 h-5" /></div>
    </div>
    {hint && <p className="text-[11px] text-slate-500 mt-3">{hint}</p>}
  </div>;
  return to ? <Link to={to} className="block hover:-translate-y-0.5 transition-transform">{body}</Link> : body;
};

export const CommitteeEmpty = ({ title, description, actionText, actionTo }) => (
  <EmptyState icon={Users} title={title} description={description}
    actionText={actionText} onAction={actionTo ? () => { window.location.href = actionTo; } : undefined} />
);

export const MemberCard = ({ member }) => {
  const person = member.userId || {};
  return <div className="glass-card p-5">
    <div className="flex items-center gap-3">
      {person.avatarUrl
        ? <img src={person.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border border-slate-700" />
        : <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-teal-200 font-bold">{person.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?'}</div>}
      <div className="min-w-0">
        <h3 className="font-bold text-slate-100 truncate">{person.name || 'Society member'}</h3>
        <p className="text-xs text-teal-300 mt-0.5">{roleLabel(member.designation)}</p>
      </div>
    </div>
    <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-700/60">
      <span className="text-xs text-slate-400">Term {new Date(member.termStart).getFullYear()} – {new Date(member.termEnd).getFullYear()}</span>
      <Badge status={member.status}>{member.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
    </div>
  </div>;
};

export const ActivityTimeline = ({ entries = [] }) => entries.length ? (
  <ol className="space-y-4">
    {entries.map((entry) => <li key={entry._id} className="flex gap-3">
      <span className="mt-1.5 w-2 h-2 rounded-full bg-teal-400 ring-4 ring-teal-400/10 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-slate-200">{entry.action.replaceAll('_', ' ').toLowerCase()}</p>
        <p className="text-xs text-slate-500 mt-0.5">{entry.userName} · {dateTimeLabel(entry.createdAt)}</p>
      </div>
    </li>)}
  </ol>
) : <div className="flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="w-4 h-4" />No activity recorded yet.</div>;

export const GovernancePanel = ({ title, to, children }) => (
  <section className="glass-card overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
      <h2 className="font-bold text-slate-100">{title}</h2>
      {to && <Link to={to} className="text-xs font-semibold text-teal-300 hover:text-teal-200">View all</Link>}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

export const InlineError = ({ children }) => children ? <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{children}</div> : null;
