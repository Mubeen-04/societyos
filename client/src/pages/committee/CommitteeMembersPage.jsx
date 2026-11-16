import React, { useEffect, useState } from 'react';
import { Plus, UserRound, UserX } from 'lucide-react';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { CommitteePageHeader, dateLabel, InlineError, MemberCard } from '../../components/committee/CommitteeComponents';

const governanceRoles = ['CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'];

export const CommitteeMembersPage = () => {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canManage = user?.role !== 'SUPER_ADMIN' && (hasPermission('MANAGE_COMMITTEE') || hasPermission('USER_MANAGEMENT'));
  const [members, setMembers] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ userId: '', designation: 'COMMITTEE_MEMBER', termStart: '', termEnd: '' });

  const load = async () => {
    setError('');
    try {
      const [membersRes, peopleRes] = await Promise.all([api.get('/committee/members?status=ALL'), canManage ? api.get('/committee/people') : Promise.resolve({ data: [] })]);
      setMembers(membersRes.data || []);
      setPeople((peopleRes.data || []).filter((person) => governanceRoles.includes(person.role)));
    } catch (err) { setError(err.message || 'Unable to load committee members.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await api.post('/committee/members', form);
      setForm({ userId: '', designation: 'COMMITTEE_MEMBER', termStart: '', termEnd: '' });
      setMessage('Committee member added.'); await load();
    } catch (err) { setError(err.message || 'Could not add this committee member.'); }
  };

  const updateStatus = async (member, status) => {
    setError(''); setMessage('');
    try { await api.patch(`/committee/members/${member._id}`, { status }); setMessage(status === 'ACTIVE' ? 'Membership reactivated.' : 'Membership ended.'); await load(); }
    catch (err) { setError(err.message || 'Could not update membership.'); }
  };

  return <div className="space-y-6 animate-fade-in">
    <CommitteePageHeader title="Committee members" description="Society officers and committee members serving the current term." />
    <InlineError>{error}</InlineError>
    {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}
    {canManage && <form onSubmit={submit} className="glass-card p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
      <div className="xl:col-span-2"><label className="input-label">Society user</label><select className="input-field" required value={form.userId} onChange={(e) => { const person = people.find((item) => item._id === e.target.value); setForm({ ...form, userId: e.target.value, designation: person?.role || form.designation }); }}><option value="">Choose a governance user</option>{people.map((person) => <option key={person._id} value={person._id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></div>
      <div><label className="input-label">Designation</label><select className="input-field" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}>{governanceRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></div>
      <div><label className="input-label">Term starts</label><input className="input-field" type="date" required value={form.termStart} onChange={(e) => setForm({ ...form, termStart: e.target.value })} /></div>
      <div className="flex gap-2"><div className="flex-1"><label className="input-label">Term ends</label><input className="input-field" type="date" required value={form.termEnd} onChange={(e) => setForm({ ...form, termEnd: e.target.value })} /></div><button className="btn-primary h-10 px-3" title="Add committee member"><Plus className="w-4 h-4" /></button></div>
    </form>}

    {loading ? <LoadingSpinner text="Loading committee members..." /> : <>
      {governanceRoles.map((role) => {
        const grouped = members.filter((member) => member.designation === role);
        return <section key={role} className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-200">{role.replaceAll('_', ' ')}</h2><span className="text-xs text-slate-500">{grouped.length} record{grouped.length === 1 ? '' : 's'}</span></div>
          {grouped.length ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{grouped.map((member) => <div key={member._id} className="space-y-2"><MemberCard member={member} /><div className="px-1 flex items-center justify-between text-xs text-slate-500"><span>{dateLabel(member.termStart)} – {dateLabel(member.termEnd)}</span>{canManage && <button onClick={() => updateStatus(member, member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')} className="inline-flex items-center gap-1.5 text-slate-400 hover:text-rose-300">{member.status === 'ACTIVE' ? <><UserX className="w-3.5 h-3.5" /> End term</> : <><UserRound className="w-3.5 h-3.5" /> Reactivate</>}</button>}</div></div>)}</div> : <div className="glass-card p-5 text-sm text-slate-500">No {role.toLowerCase().replaceAll('_', ' ')} records.</div>}
        </section>;
      })}
      {!members.length && <div className="glass-card p-8 text-center text-sm text-slate-400">No committee members have been assigned to this society yet.</div>}
    </>}
  </div>;
};
