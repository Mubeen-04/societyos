import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CalendarDays, CheckSquare, ClipboardCheck, FilePlus2, WalletCards } from 'lucide-react';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { ActivityTimeline, CommitteeEmpty, CommitteePageHeader, dateLabel, GovernancePanel, GovernanceStat, InlineError, MemberCard } from '../../components/committee/CommitteeComponents';

export const CommitteeOverview = () => {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const priorities = [
    { permission: 'VIEW_APPROVALS', label: 'Review approvals', to: '/committee/proposals' },
    { permission: 'MANAGE_MEETINGS', label: 'Meetings & minutes', to: '/committee/meetings' },
    { permission: 'CREATE_PROPOSAL', label: 'Coordinate proposals', to: '/committee/proposals' },
    { permission: 'VOTE_ON_PROPOSAL', label: 'Committee voting', to: '/committee/proposals' },
    { permission: 'VIEW_FINANCES', label: 'Financial summary', to: '/committee/financials' },
    { permission: 'MANAGE_COMMITTEE', label: 'Action item oversight', to: '/committee/action-items' }
  ].filter((item) => hasPermission(item.permission));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const requests = [api.get('/committee/overview')];
        if (hasPermission('VIEW_FINANCES')) requests.push(api.get('/analytics/overview'));
        const responses = await Promise.all(requests);
        if (!active) return;
        setData(responses[0].data);
        if (responses[1]?.success) setFinancials(responses[1].data.financials);
      } catch (err) {
        if (active) setError(err.message || 'Could not load governance information.');
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [hasPermission]);

  if (loading) return <LoadingSpinner text="Loading society governance..." />;

  return <div className="space-y-7 animate-fade-in">
    <CommitteePageHeader title="Committee overview" description={`${data?.society?.name || 'Your society'} · Governance, decisions, and follow-through`} />
    <InlineError>{error}</InlineError>

    {priorities.length > 0 && <section className="glass-card p-4"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Your governance priorities</h2><div className="flex flex-wrap gap-2">{priorities.map((item) => <Link key={item.label} to={item.to} className="btn-secondary text-xs">{item.label} →</Link>)}</div></section>}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <GovernanceStat label="Active members" value={data?.activeMembers} hint={data?.currentTerm ? `Current term through ${dateLabel(data.currentTerm.end, { month: 'short', year: 'numeric' })}` : 'No current term recorded'} icon={Activity} to="/committee/members" />
      <GovernanceStat label="Upcoming meetings" value={data?.upcomingMeetingsCount} hint="Scheduled committee meetings" icon={CalendarDays} to="/committee/meetings" />
      <GovernanceStat label="Open proposals" value={data?.openProposals} hint="Awaiting committee votes" icon={FilePlus2} to="/committee/proposals" />
      <GovernanceStat label="Pending decisions" value={data?.pendingDecisions} hint={`${data?.pendingActionItems || 0} open action items`} icon={CheckSquare} to="/committee/decisions" />
      {hasPermission('MANAGE_MEETINGS') && <GovernanceStat label="Pending minutes" value={data?.pendingMinutes} hint="Completed meetings awaiting minutes" icon={ClipboardCheck} to="/committee/meetings" />}
      {hasPermission('APPROVE_PROPOSAL') && <GovernanceStat label="Pending approvals" value={data?.pendingApprovals} hint="Passed proposals awaiting Chairman confirmation" icon={ClipboardCheck} to="/committee/proposals" />}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <GovernancePanel title="Current committee" to="/committee/members">
        {data?.members?.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">{data.members.map((member) => <MemberCard key={member._id} member={member} />)}</div> : <CommitteeEmpty title="No committee members yet" description="Add the current society officers to start using governance tools." actionText={user?.role !== 'SUPER_ADMIN' && (hasPermission('MANAGE_COMMITTEE') || hasPermission('USER_MANAGEMENT')) ? 'Manage members' : undefined} actionTo="/committee/members" />}
      </GovernancePanel>

      <div className="space-y-6">
        <GovernancePanel title="Upcoming meetings" to="/committee/meetings">
          {data?.upcomingMeetings?.length ? <div className="space-y-3">{data.upcomingMeetings.slice(0, 4).map((meeting) => <Link key={meeting._id} to={`/committee/meetings/${meeting._id}`} className="block p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <p className="text-sm font-semibold text-slate-100">{meeting.title}</p><p className="text-xs text-teal-300 mt-1">{dateLabel(meeting.date)} · {meeting.startTime}</p><p className="text-xs text-slate-500 mt-1">{meeting.location || 'Location to be confirmed'}</p>
          </Link>)}</div> : <CommitteeEmpty title="No upcoming meetings" description="There are currently no scheduled committee meetings." actionText={hasPermission('MANAGE_MEETINGS') ? 'Schedule meeting' : undefined} actionTo="/committee/meetings" />}
        </GovernancePanel>

        <GovernancePanel title="My open action items" to="/committee/action-items">
          <p className="text-3xl font-bold text-slate-100">{data?.myActionItems ?? 0}</p><p className="text-xs text-slate-500 mt-1">Tasks assigned to you that still need work.</p>
          <Link to="/committee/action-items" className="inline-block mt-4 text-xs font-semibold text-teal-300 hover:text-teal-200">Review action items →</Link>
        </GovernancePanel>

        {hasPermission('VIEW_FINANCES') && <GovernancePanel title="Financial summary" to="/committee/financials">
          <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300"><WalletCards className="w-5 h-5" /></div><div><p className="text-xl font-bold text-slate-100">{financials?.collectionRate ?? '—'}{financials?.collectionRate != null ? '%' : ''}</p><p className="text-xs text-slate-500">Collection rate</p></div></div>
        </GovernancePanel>}
      </div>

      <GovernancePanel title="Recent governance activity">
        <ActivityTimeline entries={data?.recentActivity || []} />
      </GovernancePanel>
    </div>
    {hasPermission('MANAGE_MEETINGS') && <p className="text-xs text-slate-500 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" />You can manage meeting schedules and record minutes.</p>}
  </div>;
};
