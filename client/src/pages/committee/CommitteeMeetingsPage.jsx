import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, FileText, Users } from 'lucide-react';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { ActivityTimeline, CommitteeEmpty, CommitteePageHeader, dateLabel, InlineError } from '../../components/committee/CommitteeComponents';
import { usePermissions } from '../../hooks/usePermissions';

const emptyForm = { title: '', description: '', date: '', startTime: '', endTime: '', location: '', agenda: '', participants: [], attachments: [] };

export const CommitteeMeetingsPage = () => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('MANAGE_MEETINGS');
  const [meetings, setMeetings] = useState([]);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setError('');
    try {
      const [meetingRes, peopleRes] = await Promise.all([api.get('/committee/meetings'), api.get('/committee/people')]);
      setMeetings(meetingRes.data || []); setPeople(peopleRes.data || []);
    } catch (err) { setError(err.message || 'Could not load meetings.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key === 'attachments') [...value].forEach((file) => body.append('attachments', file));
        else if (key === 'participants') body.append(key, JSON.stringify(value));
        else body.append(key, value);
      }
      await api.post('/committee/meetings', body);
      setForm(emptyForm); setNotice('Meeting scheduled. Participants have been notified.'); await load();
    } catch (err) { setError(err.message || 'Could not schedule the meeting.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6 animate-fade-in">
    <CommitteePageHeader title="Committee meetings" description="Schedule meetings, share agendas, record minutes, and track follow-up." actions={canCreate && <a href="#schedule-meeting" className="btn-primary text-xs gap-2"><CalendarPlus className="w-4 h-4" /> Schedule meeting</a>} />
    <InlineError>{error}</InlineError>{notice && <p className="text-sm text-emerald-300">{notice}</p>}
    {canCreate && <form id="schedule-meeting" onSubmit={submit} className="glass-card p-5 space-y-4">
      <h2 className="font-bold text-slate-100">Schedule a meeting</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className="input-label">Title *</label><input className="input-field" required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Society clubhouse" /></div>
        <div><label className="input-label">Date *</label><input className="input-field" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="input-label">Start time *</label><input className="input-field" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div><div><label className="input-label">End time</label><input className="input-field" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div></div>
        <div><label className="input-label">Description</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="input-label">Participants</label><select className="input-field min-h-11" multiple value={form.participants} onChange={(e) => setForm({ ...form, participants: [...e.target.selectedOptions].map((option) => option.value) })}>{people.map((person) => <option key={person._id} value={person._id}>{person.name} · {person.role.replaceAll('_', ' ')}</option>)}</select></div>
        <div><label className="input-label">Agenda</label><textarea className="input-field min-h-24" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="One agenda item per line" /></div>
        <div><label className="input-label">Documents</label><input className="input-field" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, attachments: e.target.files })} /></div>
      </div>
      <button className="btn-primary text-xs" disabled={saving}>{saving ? 'Scheduling…' : 'Create meeting'}</button>
    </form>}
    {loading ? <LoadingSpinner text="Loading meeting schedule..." /> : meetings.length ? <div className="space-y-3">{meetings.map((meeting) => <Link key={meeting._id} to={`/committee/meetings/${meeting._id}`} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-500/40 transition-colors">
      <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-100">{meeting.title}</h2><Badge status={meeting.status}>{meeting.status.replaceAll('_', ' ')}</Badge></div><p className="text-xs text-slate-400 mt-2">{dateLabel(meeting.date)} · {meeting.startTime}{meeting.endTime ? ` – ${meeting.endTime}` : ''} · {meeting.location || 'Location to be confirmed'}</p><p className="text-xs text-slate-500 mt-1">{meeting.participants?.length || 0} participants · {meeting.agenda?.length || 0} agenda items</p></div>
      <span className="text-xs text-teal-300">Open meeting →</span>
    </Link>)}</div> : <CommitteeEmpty title="No meetings yet" description="There are currently no scheduled committee meetings." />}
  </div>;
};

export const CommitteeMeetingDetailPage = () => {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('MANAGE_MEETINGS');
  const [record, setRecord] = useState(null);
  const [minutes, setMinutes] = useState({ summary: '', discussionPoints: '', decisions: '', notes: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = await api.get(`/committee/meetings/${id}`); setRecord(response.data);
      const saved = response.data.meeting.minutes || {};
      setMinutes({ summary: saved.summary || '', discussionPoints: (saved.discussionPoints || []).join('\n'), decisions: (saved.decisions || []).join('\n'), notes: saved.notes || '' });
    } catch (err) { setError(err.message || 'Could not load this meeting.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const saveMinutes = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await api.patch(`/committee/meetings/${id}/minutes`, minutes); setNotice('Meeting minutes saved.'); await load(); }
    catch (err) { setError(err.message || 'Could not save minutes.'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (status) => {
    try { await api.patch(`/committee/meetings/${id}`, { status }); setNotice(`Meeting marked ${status.toLowerCase()}.`); await load(); }
    catch (err) { setError(err.message || 'Could not update meeting status.'); }
  };

  if (loading) return <LoadingSpinner text="Loading meeting details..." />;
  if (!record) return <div className="space-y-4"><Link to="/committee/meetings" className="text-sm text-teal-300">← Meetings</Link><InlineError>{error || 'Meeting not found.'}</InlineError></div>;
  const { meeting, decisions, actionItems, activity } = record;

  return <div className="space-y-6 animate-fade-in">
    <Link to="/committee/meetings" className="inline-flex items-center gap-2 text-xs text-teal-300 hover:text-teal-200"><ArrowLeft className="w-4 h-4" /> Meetings</Link>
    <CommitteePageHeader title={meeting.title} description={`${dateLabel(meeting.date)} · ${meeting.startTime}${meeting.endTime ? ` – ${meeting.endTime}` : ''} · ${meeting.location || 'Location to be confirmed'}`} actions={<Badge status={meeting.status}>{meeting.status}</Badge>} />
    <InlineError>{error}</InlineError>{notice && <p className="text-sm text-emerald-300">{notice}</p>}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 space-y-5">
        <section className="glass-card p-5 space-y-4"><h2 className="font-bold text-slate-100">Meeting information</h2><p className="text-sm text-slate-300 whitespace-pre-line">{meeting.description || 'No description was added.'}</p><div className="flex flex-wrap gap-2">{meeting.attachments?.map((file) => <a key={file} href={file} target="_blank" rel="noreferrer" className="btn-secondary text-xs gap-2"><FileText className="w-4 h-4" /> Open attachment</a>)}</div>
          <div><h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Agenda</h3>{meeting.agenda?.length ? <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">{meeting.agenda.map((item, index) => <li key={index}>{item}</li>)}</ol> : <p className="text-sm text-slate-500">No agenda recorded.</p>}</div>
          <div><h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Participants</h3><div className="flex flex-wrap gap-2">{meeting.participants?.length ? meeting.participants.map((person) => <span key={person._id} className="px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300">{person.name} · {person.role.replaceAll('_', ' ')}</span>) : <p className="text-sm text-slate-500">No participants selected.</p>}</div></div>
        </section>
        <section className="glass-card p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-100">Decisions</h2><Link to={`/committee/decisions?meetingId=${id}`} className="text-xs text-teal-300">Create or track decision →</Link></div>{decisions.length ? <div className="space-y-3">{decisions.map((decision) => <div key={decision._id} className="p-3 rounded-xl bg-slate-800/50 flex justify-between gap-3"><span className="text-sm text-slate-200">{decision.title}</span><Badge status={decision.status}>{decision.status}</Badge></div>)}</div> : <p className="text-sm text-slate-500">No decisions have been recorded for this meeting.</p>}</section>
        <section className="glass-card p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-100">Action items</h2><Link to={`/committee/action-items?meetingId=${id}`} className="text-xs text-teal-300">Create or track action item →</Link></div>{actionItems.length ? <div className="space-y-3">{actionItems.map((item) => <div key={item._id} className="p-3 rounded-xl bg-slate-800/50 flex justify-between gap-3"><div><p className="text-sm text-slate-200">{item.title}</p><p className="text-xs text-slate-500 mt-1">Assigned to {item.assignedTo?.name || '—'}</p></div><Badge status={item.status}>{item.status}</Badge></div>)}</div> : <p className="text-sm text-slate-500">No action items have been assigned.</p>}</section>
      </div>
      <div className="space-y-5">
        {canManage && <><form onSubmit={saveMinutes} className="glass-card p-5 space-y-3"><h2 className="font-bold text-slate-100">Meeting minutes</h2><div><label className="input-label">Summary</label><textarea className="input-field min-h-20" value={minutes.summary} onChange={(e) => setMinutes({ ...minutes, summary: e.target.value })} /></div><div><label className="input-label">Discussion points</label><textarea className="input-field min-h-20" placeholder="One point per line" value={Array.isArray(minutes.discussionPoints) ? minutes.discussionPoints.join('\n') : minutes.discussionPoints} onChange={(e) => setMinutes({ ...minutes, discussionPoints: e.target.value })} /></div><div><label className="input-label">Decisions recorded</label><textarea className="input-field min-h-20" placeholder="One decision per line" value={Array.isArray(minutes.decisions) ? minutes.decisions.join('\n') : minutes.decisions} onChange={(e) => setMinutes({ ...minutes, decisions: e.target.value })} /></div><div><label className="input-label">Notes</label><textarea className="input-field min-h-16" value={minutes.notes} onChange={(e) => setMinutes({ ...minutes, notes: e.target.value })} /></div><button className="btn-primary text-xs" disabled={saving}>{saving ? 'Saving…' : 'Save minutes'}</button></form><div className="glass-card p-4 flex gap-2">{meeting.status === 'SCHEDULED' && <button onClick={() => updateStatus('ONGOING')} className="btn-secondary text-xs flex-1">Mark ongoing</button>}{meeting.status !== 'COMPLETED' && meeting.status !== 'CANCELLED' && <button onClick={() => updateStatus('CANCELLED')} className="btn-secondary text-xs flex-1 text-rose-300">Cancel meeting</button>}</div></>}
        <section className="glass-card p-5"><h2 className="font-bold text-slate-100 mb-4">Activity history</h2><ActivityTimeline entries={activity || []} /></section>
      </div>
    </div>
  </div>;
};
