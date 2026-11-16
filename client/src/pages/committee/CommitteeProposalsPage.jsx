import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FilePlus2, ThumbsDown, ThumbsUp } from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ActivityTimeline, CommitteeEmpty, CommitteePageHeader, dateTimeLabel, InlineError } from '../../components/committee/CommitteeComponents';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const categories = ['SECURITY', 'MAINTENANCE', 'FINANCE', 'INFRASTRUCTURE', 'AMENITIES', 'POLICY', 'OTHER'];

export const CommitteeProposalsPage = () => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('CREATE_PROPOSAL');
  const canCancel = canCreate || hasPermission('APPROVE_PROPOSAL');
  const [proposals, setProposals] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', category: 'OTHER', votingStart: '', votingEnd: '', attachments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => { try { const response = await api.get('/committee/proposals'); setProposals(response.data || []); } catch (err) { setError(err.message || 'Could not load proposals.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'attachments') [...value].forEach((file) => body.append('attachments', file));
        else if (key === 'votingStart' || key === 'votingEnd') body.append(key, value ? new Date(value).toISOString() : '');
        else body.append(key, value);
      });
      await api.post('/committee/proposals', body);
      setForm({ title: '', description: '', category: 'OTHER', votingStart: '', votingEnd: '', attachments: [] }); setNotice('Proposal saved as a draft.'); await load();
    } catch (err) { setError(err.message || 'Could not create proposal.'); }
    finally { setSaving(false); }
  };

  const publish = async (proposal) => {
    setError('');
    try { await api.patch(`/committee/proposals/${proposal._id}/publish`); setNotice('Proposal opened for committee voting.'); await load(); }
    catch (err) { setError(err.message || 'Could not publish proposal.'); }
  };

  const cancel = async (proposal) => {
    if (!window.confirm(`Cancel "${proposal.title}"?`)) return;
    setError('');
    try { await api.patch(`/committee/proposals/${proposal._id}/cancel`); setNotice('Proposal cancelled.'); await load(); }
    catch (err) { setError(err.message || 'Could not cancel proposal.'); }
  };

  return <div className="space-y-6 animate-fade-in">
    <CommitteePageHeader title="Proposals & voting" description="Review governance proposals, follow committee votes, and track the decision outcome." />
    <InlineError>{error}</InlineError>{notice && <p className="text-sm text-emerald-300">{notice}</p>}
    {canCreate && <form onSubmit={create} className="glass-card p-5 space-y-4"><h2 className="font-bold text-slate-100">Create proposal draft</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><label className="input-label">Title *</label><input required className="input-field" maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><label className="input-label">Category</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
      <div className="md:col-span-2"><label className="input-label">Description *</label><textarea required className="input-field min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div><label className="input-label">Voting starts</label><input className="input-field" type="datetime-local" value={form.votingStart} onChange={(e) => setForm({ ...form, votingStart: e.target.value })} /></div>
      <div><label className="input-label">Voting ends</label><input className="input-field" type="datetime-local" value={form.votingEnd} onChange={(e) => setForm({ ...form, votingEnd: e.target.value })} /></div>
      <div><label className="input-label">Attachments</label><input className="input-field" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, attachments: e.target.files })} /></div>
    </div><button className="btn-primary text-xs" disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button></form>}
    {loading ? <LoadingSpinner text="Loading society proposals..." /> : proposals.length ? <div className="space-y-3">{proposals.map((proposal) => <article key={proposal._id} className="glass-card p-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-100">{proposal.title}</h2><Badge status={proposal.status}>{proposal.status.replaceAll('_', ' ')}</Badge><Badge variant={proposal.category}>{proposal.category}</Badge></div><p className="text-sm text-slate-400 mt-2 line-clamp-2">{proposal.description}</p><p className="text-xs text-slate-500 mt-2">By {proposal.createdBy?.name || 'Committee'} · {proposal.votingEnd ? `Voting ends ${dateTimeLabel(proposal.votingEnd)}` : 'Voting period not set'}</p></div>
        <div className="flex items-center gap-2 shrink-0"><Link to={`/committee/proposals/${proposal._id}`} className="btn-secondary text-xs">View proposal</Link>{canCreate && proposal.status === 'DRAFT' && <button onClick={() => publish(proposal)} className="btn-primary text-xs">Open voting</button>}{canCancel && ['DRAFT', 'OPEN_FOR_VOTING'].includes(proposal.status) && (proposal.voteSummary?.total || 0) === 0 && <button onClick={() => cancel(proposal)} className="btn-secondary text-xs text-rose-300">Cancel</button>}</div>
      </div>
      {proposal.status === 'OPEN_FOR_VOTING' && <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-700/60 text-center"><VoteCount label="YES" count={proposal.voteSummary?.YES} /><VoteCount label="NO" count={proposal.voteSummary?.NO} /><VoteCount label="ABSTAIN" count={proposal.voteSummary?.ABSTAIN} /><VoteCount label="TOTAL" count={proposal.voteSummary?.total} /></div>}
    </article>)}</div> : <CommitteeEmpty title="No proposals yet" description="Society proposals will appear here." />}
  </div>;
};

const VoteCount = ({ label, count }) => <div className="rounded-xl bg-slate-800/60 py-2"><p className="text-[10px] text-slate-500 font-bold">{label}</p><p className="text-lg text-slate-100 font-bold">{count ?? 0}</p></div>;

export const CommitteeProposalDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [proposal, setProposal] = useState(null);
  const [isCommitteeMember, setIsCommitteeMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [proposalRes, membersRes] = await Promise.all([api.get(`/committee/proposals/${id}`), api.get('/committee/members?status=ACTIVE')]);
      setProposal(proposalRes.data);
      const now = new Date();
      setIsCommitteeMember((membersRes.data || []).some((member) => member.userId?._id === user.id && new Date(member.termStart) <= now && new Date(member.termEnd) >= now));
    } catch (err) { setError(err.message || 'Could not load proposal details.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id, user.id]);

  const vote = async (value) => {
    setSaving(true); setError('');
    try { await api.post(`/committee/proposals/${id}/vote`, { vote: value }); setNotice('Vote recorded. Your vote cannot be changed.'); await load(); }
    catch (err) { setError(err.message || 'Could not record your vote.'); }
    finally { setSaving(false); }
  };

  const closeVoting = async () => {
    setSaving(true); setError('');
    try { await api.post(`/committee/proposals/${id}/close`); setNotice('Voting closed and the result was calculated.'); await load(); }
    catch (err) { setError(err.message || 'Could not close voting.'); }
    finally { setSaving(false); }
  };

  const confirmApproval = async () => {
    setSaving(true); setError('');
    try { await api.post(`/committee/proposals/${id}/approve`); setNotice('Chairman confirmation recorded.'); await load(); }
    catch (err) { setError(err.message || 'Could not record approval.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner text="Loading proposal..." />;
  if (!proposal) return <div className="space-y-4"><Link to="/committee/proposals" className="text-sm text-teal-300">← Proposals</Link><InlineError>{error || 'Proposal not found.'}</InlineError></div>;
  const canVote = hasPermission('VOTE_ON_PROPOSAL') && isCommitteeMember && proposal.status === 'OPEN_FOR_VOTING' && new Date(proposal.votingStart) <= new Date() && new Date(proposal.votingEnd) >= new Date() && !proposal.voteSummary?.myVote;

  return <div className="space-y-6 animate-fade-in">
    <Link to="/committee/proposals" className="inline-flex items-center gap-2 text-xs text-teal-300"><ArrowLeft className="w-4 h-4" /> Proposals</Link>
    <CommitteePageHeader title={proposal.title} description={`${proposal.category} · Created by ${proposal.createdBy?.name || 'Committee'} · ${dateLabelShort(proposal.createdAt)}`} actions={<Badge status={proposal.status}>{proposal.status.replaceAll('_', ' ')}</Badge>} />
    <InlineError>{error}</InlineError>{notice && <p className="text-sm text-emerald-300">{notice}</p>}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 space-y-5">
        <section className="glass-card p-5"><h2 className="font-bold text-slate-100 mb-2">Proposal details</h2><p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">{proposal.description}</p><div className="flex flex-wrap gap-2 mt-4">{proposal.attachments?.map((file) => <a key={file} className="btn-secondary text-xs gap-2" href={file} target="_blank" rel="noreferrer"><FilePlus2 className="w-4 h-4" /> Open attachment</a>)}</div><p className="text-xs text-slate-500 mt-4">Voting: {dateTimeLabel(proposal.votingStart)} – {dateTimeLabel(proposal.votingEnd)}</p></section>
        <section className="glass-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-100">Current results</h2>{proposal.status === 'OPEN_FOR_VOTING' && hasPermission('APPROVE_PROPOSAL') && <button className="btn-secondary text-xs" disabled={saving} onClick={closeVoting}>Close voting</button>}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4"><VoteTile label="Yes" value={proposal.voteSummary?.YES} icon={ThumbsUp} /><VoteTile label="No" value={proposal.voteSummary?.NO} icon={ThumbsDown} /><VoteTile label="Abstain" value={proposal.voteSummary?.ABSTAIN} /><VoteTile label="Total votes" value={proposal.voteSummary?.total} /></div>
          {proposal.result?.calculatedAt && <div className="mt-4 p-4 rounded-xl bg-slate-800/60 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-100">{proposal.result.outcome === 'APPROVED' ? 'Approved by committee vote' : 'Rejected by committee vote'}</p><p className="text-xs text-slate-500 mt-1">Approval threshold: {Math.round(proposal.result.approvalThreshold * 100)}% of decisive votes · Closed {dateTimeLabel(proposal.result.calculatedAt)}</p></div><Badge status={proposal.result.outcome}>{proposal.result.outcome}</Badge></div>}
          {proposal.voteSummary?.myVote && <p className="mt-4 text-sm text-emerald-300">✓ Vote recorded: {proposal.voteSummary.myVote}</p>}
          {canVote && <div className="mt-5 border-t border-slate-700/60 pt-4"><p className="text-xs text-slate-400 mb-3">Cast one committee vote. It cannot be changed after submission.</p><div className="flex flex-wrap gap-2">{['YES', 'NO', 'ABSTAIN'].map((value) => <button key={value} disabled={saving} onClick={() => vote(value)} className="btn-primary text-xs min-w-24">{value === 'YES' ? 'Yes' : value === 'NO' ? 'No' : 'Abstain'}</button>)}</div></div>}
          {hasPermission('VOTE_ON_PROPOSAL') && !isCommitteeMember && <p className="mt-4 text-xs text-amber-300">Only an active, in-term committee member may vote on this proposal.</p>}
          {hasPermission('APPROVE_PROPOSAL') && proposal.status === 'APPROVED' && !proposal.approvedAt && <button className="btn-primary text-xs mt-4" disabled={saving} onClick={confirmApproval}>Confirm chairman approval</button>}
          {proposal.approvedAt && <p className="mt-3 text-xs text-emerald-300">Chairman confirmed {dateTimeLabel(proposal.approvedAt)}</p>}
          {proposal.status === 'OPEN_FOR_VOTING' && new Date(proposal.votingEnd) < new Date() && <p className="mt-4 text-xs text-slate-400">Voting period ended. Final result will be recorded by the proposal scheduler.</p>}
        </section>
        {proposal.decisions?.length > 0 && <section className="glass-card p-5"><h2 className="font-bold text-slate-100 mb-3">Linked decisions</h2>{proposal.decisions.map((decision) => <div key={decision._id} className="flex justify-between gap-3 py-2 border-t border-slate-800"><span className="text-sm text-slate-200">{decision.title}</span><Badge status={decision.status}>{decision.status}</Badge></div>)}</section>}
      </div>
      <section className="glass-card p-5"><h2 className="font-bold text-slate-100 mb-4">Activity timeline</h2><ActivityTimeline entries={proposal.activity || []} /></section>
    </div>
  </div>;
};

const VoteTile = ({ label, value, icon: Icon }) => <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4"><div className="flex items-center gap-2 text-slate-400">{Icon && <Icon className="w-4 h-4" />}<span className="text-xs">{label}</span></div><p className="text-2xl font-bold text-slate-100 mt-2">{value ?? 0}</p></div>;
const dateLabelShort = (date) => date ? new Date(date).toLocaleDateString() : 'Date not set';
