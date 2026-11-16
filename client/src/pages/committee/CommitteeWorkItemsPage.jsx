import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ActivityTimeline, CommitteeEmpty, CommitteePageHeader, dateLabel, InlineError } from '../../components/committee/CommitteeComponents';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const DecisionStatus = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const CommitteeDecisionsPage = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('APPROVE_PROPOSAL') || hasPermission('MANAGE_COMMITTEE');
  const [search] = useSearchParams();
  const [decisions, setDecisions] = useState([]);
  const [people, setPeople] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', meetingId: search.get('meetingId') || '', proposalId: search.get('proposalId') || '', responsiblePersonId: '', deadline: '', attachments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [decisionRes, peopleRes, meetingRes, proposalRes] = await Promise.all([api.get('/committee/decisions'), api.get('/committee/people'), api.get('/committee/meetings'), api.get('/committee/proposals')]);
      setDecisions(decisionRes.data || []); setPeople(peopleRes.data || []); setMeetings(meetingRes.data || []); setProposals(proposalRes.data || []);
    } catch (err) { setError(err.message || 'Could not load governance decisions.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => key === 'attachments' ? [...value].forEach((file) => body.append('attachments', file)) : body.append(key, value));
      await api.post('/committee/decisions', body);
      setForm({ title: '', description: '', meetingId: '', proposalId: '', responsiblePersonId: '', deadline: '', attachments: [] }); setNotice('Decision recorded and responsible person notified.'); await load();
    } catch (err) { setError(err.message || 'Could not create this decision.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (decision, status) => {
    setError('');
    try { await api.patch(`/committee/decisions/${decision._id}/status`, { status }); setNotice(`Decision status updated to ${status.toLowerCase()}.`); await load(); }
    catch (err) { setError(err.message || 'Could not update decision status.'); }
  };

  return <div className="space-y-6 animate-fade-in">
    <CommitteePageHeader title="Committee decisions" description="Record approved governance decisions, owners, and deadlines." />
    <InlineError>{error}</InlineError>{notice && <p className="text-sm text-emerald-300">{notice}</p>}
    {canCreate && <form onSubmit={create} className="glass-card p-5 space-y-4"><h2 className="font-bold text-slate-100">Record a decision</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><label className="input-label">Decision *</label><input required className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><label className="input-label">Responsible person *</label><select required className="input-field" value={form.responsiblePersonId} onChange={(e) => setForm({ ...form, responsiblePersonId: e.target.value })}><option value="">Assign to a society user</option>{people.map((person) => <option key={person._id} value={person._id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></div>
      <div><label className="input-label">Description</label><textarea className="input-field min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="input-label">Linked meeting</label><select className="input-field" value={form.meetingId} onChange={(e) => setForm({ ...form, meetingId: e.target.value })}><option value="">None</option>{meetings.map((meeting) => <option key={meeting._id} value={meeting._id}>{meeting.title}</option>)}</select></div><div><label className="input-label">Approved proposal</label><select className="input-field" value={form.proposalId} onChange={(e) => setForm({ ...form, proposalId: e.target.value })}><option value="">None</option>{proposals.filter((proposal) => proposal.status === 'APPROVED').map((proposal) => <option key={proposal._id} value={proposal._id}>{proposal.title}</option>)}</select></div></div>
      <div><label className="input-label">Deadline</label><input className="input-field" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div><div><label className="input-label">Supporting documents</label><input className="input-field" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, attachments: e.target.files })} /></div>
    </div><button className="btn-primary text-xs" disabled={saving}>{saving ? 'Saving…' : 'Create decision'}</button></form>}
    {loading ? <LoadingSpinner text="Loading decisions..." /> : decisions.length ? <div className="space-y-3">{decisions.map((decision) => <article key={decision._id} className="glass-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-100">{decision.title}</h2><Badge status={decision.status}>{decision.status.replaceAll('_', ' ')}</Badge></div><p className="text-sm text-slate-400 mt-2">{decision.description || 'No description provided.'}</p><p className="text-xs text-slate-500 mt-2">Responsible: {decision.responsiblePersonId?.name || '—'} · Deadline: {dateLabel(decision.deadline)}</p>{decision.meetingId && <p className="text-xs text-slate-500 mt-1">From meeting: {decision.meetingId.title}</p>}</div>
        <div className="flex items-center gap-2 shrink-0">{(hasPermission('MANAGE_COMMITTEE') || hasPermission('APPROVE_PROPOSAL') || decision.responsiblePersonId?._id === user?.id) && <select className="input-field py-2" value={decision.status} onChange={(e) => changeStatus(decision, e.target.value)}>{DecisionStatus.map((status) => <option key={status}>{status}</option>)}</select>}<a href={`/committee/action-items?decisionId=${decision._id}`} className="btn-secondary text-xs">Action items</a></div>
      </div>
      {decision.activity?.length > 0 && <details className="mt-4 border-t border-slate-800 pt-3"><summary className="text-xs text-teal-300 cursor-pointer">View activity history</summary><div className="mt-3"><ActivityTimeline entries={decision.activity} /></div></details>}
    </article>)}</div> : <CommitteeEmpty title="No decisions yet" description="Approved committee outcomes can be recorded and assigned here." />}
  </div>;
};

export const CommitteeActionItemsPage = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [search] = useSearchParams();
  const canManage = hasPermission('MANAGE_COMMITTEE') || hasPermission('APPROVE_PROPOSAL');
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', meetingId: search.get('meetingId') || '', decisionId: search.get('decisionId') || '', deadline: '', priority: 'MEDIUM', attachments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    try {
      const [itemRes, peopleRes, meetingRes, decisionRes] = await Promise.all([api.get('/committee/action-items'), api.get('/committee/people'), api.get('/committee/meetings'), api.get('/committee/decisions')]);
      setItems(itemRes.data || []); setPeople(peopleRes.data || []); setMeetings(meetingRes.data || []); setDecisions(decisionRes.data || []);
    } catch (err) { setError(err.message || 'Could not load action items.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => key === 'attachments' ? [...value].forEach((file) => body.append('attachments', file)) : body.append(key, value));
      await api.post('/committee/action-items', body);
      setForm({ title: '', description: '', assignedTo: '', meetingId: '', decisionId: '', deadline: '', priority: 'MEDIUM', attachments: [] }); setNotice('Action item assigned and the owner notified.'); await load();
    } catch (err) { setError(err.message || 'Could not create this action item.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (item, status) => {
    setError('');
    try { await api.patch(`/committee/action-items/${item._id}`, { status }); setNotice('Action item status updated.'); await load(); }
    catch (err) { setError(err.message || 'Could not update action item.'); }
  };

  return <div className="space-y-6 animate-fade-in">
    <CommitteePageHeader title="Action items" description="Track governance follow-through by owner, due date, priority, and status." />
    <InlineError>{error}</InlineError>{notice && <p className="text-sm text-emerald-300">{notice}</p>}
    {canManage && <form onSubmit={create} className="glass-card p-5 space-y-4"><h2 className="font-bold text-slate-100">Assign an action item</h2><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <div><label className="input-label">Task *</label><input required className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><label className="input-label">Assigned to *</label><select required className="input-field" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}><option value="">Choose a society user</option>{people.map((person) => <option key={person._id} value={person._id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></div>
      <div><label className="input-label">Priority</label><select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => <option key={priority}>{priority}</option>)}</select></div>
      <div><label className="input-label">Description</label><textarea className="input-field min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div><label className="input-label">Linked meeting</label><select className="input-field" value={form.meetingId} onChange={(e) => setForm({ ...form, meetingId: e.target.value })}><option value="">None</option>{meetings.map((meeting) => <option key={meeting._id} value={meeting._id}>{meeting.title}</option>)}</select></div>
      <div><label className="input-label">Linked decision</label><select className="input-field" value={form.decisionId} onChange={(e) => setForm({ ...form, decisionId: e.target.value })}><option value="">None</option>{decisions.map((decision) => <option key={decision._id} value={decision._id}>{decision.title}</option>)}</select></div>
      <div><label className="input-label">Deadline</label><input className="input-field" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div><div><label className="input-label">Supporting documents</label><input className="input-field" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, attachments: e.target.files })} /></div>
    </div><button className="btn-primary text-xs" disabled={saving}>{saving ? 'Assigning…' : 'Create action item'}</button></form>}
    {loading ? <LoadingSpinner text="Loading action items..." /> : items.length ? <div className="overflow-x-auto glass-card"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-800/80 text-[10px] uppercase text-slate-400"><tr><th className="px-4 py-3">Action item</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Update</th></tr></thead><tbody className="divide-y divide-slate-800">{items.map((item) => {
      const canUpdate = canManage || item.assignedTo?._id === user.id;
      return <tr key={item._id}><td className="px-4 py-4"><p className="font-semibold text-slate-100">{item.title}</p><p className="text-xs text-slate-500 mt-1">{item.description || item.meetingId?.title || item.decisionId?.title || 'Governance follow-up'}</p>{item.activity?.length > 0 && <details className="mt-2"><summary className="text-[11px] text-teal-300 cursor-pointer">Activity history</summary><div className="mt-2"><ActivityTimeline entries={item.activity} /></div></details>}</td><td className="px-4 py-4 text-slate-300">{item.assignedTo?.name || '—'}</td><td className="px-4 py-4 text-slate-400">{dateLabel(item.deadline)}</td><td className="px-4 py-4"><Badge variant={item.priority}>{item.priority}</Badge></td><td className="px-4 py-4"><Badge status={item.status}>{item.status.replaceAll('_', ' ')}</Badge></td><td className="px-4 py-4">{canUpdate && <select className="input-field py-2" value={item.status} onChange={(e) => changeStatus(item, e.target.value)}>{DecisionStatus.map((status) => <option key={status}>{status}</option>)}</select>}</td></tr>;
    })}</tbody></table></div> : <CommitteeEmpty title="No pending action items" description="You're all caught up." />}
    <p className="text-xs text-slate-500 flex items-center gap-2"><CheckSquare className="w-4 h-4" />Assigned users can update their own work status. Governance leads can oversee the full list.</p>
  </div>;
};
