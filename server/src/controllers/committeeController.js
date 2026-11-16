import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { CommitteeActionItem } from '../models/CommitteeActionItem.js';
import { CommitteeDecision } from '../models/CommitteeDecision.js';
import { CommitteeMeeting } from '../models/CommitteeMeeting.js';
import { CommitteeMember } from '../models/CommitteeMember.js';
import { CommitteeProposal, CommitteeVote } from '../models/CommitteeProposal.js';
import { Notification } from '../models/Notification.js';
import { Society } from '../models/Society.js';
import { User } from '../models/User.js';
import { ROLES, ROLE_PERMISSIONS } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';

const committeeRoles = [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.COMMITTEE_MEMBER];
const officeHolderRoles = [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER];
const memberPopulate = { path: 'userId', select: 'name email phone avatarUrl role apartmentId', populate: { path: 'apartmentId', select: 'unitNumber' } };
const attachmentUrls = (files = []) => files.map((file) => `/uploads/${file.filename}`);
const listField = (value) => Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : String(value || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
const validDate = (value) => value && !Number.isNaN(new Date(value).getTime());
const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const timeMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const hasPermission = (user, permission) => (ROLE_PERMISSIONS[user.role] || []).includes(permission);
const canManageGovernance = (user) => hasPermission(user, 'MANAGE_COMMITTEE') || hasPermission(user, 'USER_MANAGEMENT');
const canCreateDecision = (user) => hasPermission(user, 'APPROVE_PROPOSAL') || hasPermission(user, 'MANAGE_COMMITTEE');

const notifyUsers = async (societyId, userIds, title, message, link, metadata = {}) => {
  const uniqueIds = [...new Set(userIds.map((id) => id?.toString()).filter(Boolean))];
  if (!uniqueIds.length) return;
  try {
    await Notification.insertMany(uniqueIds.map((recipientId) => ({ societyId, recipientId, type: 'GOVERNANCE_UPDATE', title, message, link, metadata })), { ordered: false });
  } catch (error) {
    console.error('Could not create governance notifications:', error.message);
  }
};

const normalizeIds = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return value.split(',').map((item) => item.trim()).filter(Boolean); }
};

const notifyCommittee = async (societyId, title, message, link, metadata) => {
  const members = await CommitteeMember.find({ societyId, status: 'ACTIVE' }).select('userId');
  return notifyUsers(societyId, members.map((member) => member.userId), title, message, link, metadata);
};

const validateSocietyUsers = async (societyId, ids) => {
  const uniqueIds = [...new Set((ids || []).map(String))];
  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) return null;
  const users = await User.find({ _id: { $in: uniqueIds }, societyId, isActive: true }).select('_id');
  return users.length === uniqueIds.length ? users : null;
};

const ensureDateTimeRange = (start, end) => {
  if (!validTime(start) || (end && !validTime(end))) return false;
  return !end || timeMinutes(end) > timeMinutes(start);
};

const activeOfficeHolderExists = (societyId, designation, excludeId = null) => {
  if (!officeHolderRoles.includes(designation)) return Promise.resolve(false);
  return CommitteeMember.exists({ societyId, designation, status: 'ACTIVE', ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
};

const closeProposal = async (proposal, society, req = null) => {
  if (proposal.status !== 'OPEN_FOR_VOTING') return proposal;
  const votes = await CommitteeVote.find({ proposalId: proposal._id, societyId: proposal.societyId }).select('vote');
  const counts = votes.reduce((result, entry) => {
    result[entry.vote.toLowerCase()] += 1;
    return result;
  }, { yes: 0, no: 0, abstain: 0 });
  const decisiveVotes = counts.yes + counts.no;
  const threshold = society?.settings?.proposalApprovalThreshold ?? 0.5;
  const passed = decisiveVotes > 0 && counts.yes > counts.no && counts.yes / decisiveVotes >= threshold;
  const previousState = { status: proposal.status, result: proposal.result?.toObject?.() || proposal.result };
  proposal.status = passed ? 'APPROVED' : 'REJECTED';
  proposal.result = { ...counts, total: votes.length, outcome: proposal.status, approvalThreshold: threshold, calculatedAt: new Date() };
  await proposal.save();
  const actor = req?.user || (proposal.createdBy?.name ? proposal.createdBy : await User.findById(proposal.createdBy));
  if (actor) await logAudit({ req: req || { user: actor, societyId: proposal.societyId, ip: 'system' }, action: 'PROPOSAL_VOTING_CLOSED', entity: 'CommitteeProposal', entityId: proposal._id, previousState, newState: { status: proposal.status, result: proposal.result } });
  await notifyCommittee(proposal.societyId, 'Proposal voting closed', `${proposal.title} was ${proposal.status.toLowerCase()}.`, '/committee/proposals', { proposalId: proposal._id, status: proposal.status });
  return proposal;
};

export const getOverview = async (req, res, next) => {
  try {
    const societyId = req.societyId;
    const now = new Date();
    const [members, upcomingMeetings, upcomingMeetingsCount, openProposals, pendingApprovals, pendingDecisions, pendingActionItems, recentActivity, society] = await Promise.all([
      CommitteeMember.find({ societyId, status: 'ACTIVE' }).populate(memberPopulate).sort({ designation: 1, createdAt: 1 }),
      CommitteeMeeting.find({ societyId, status: 'SCHEDULED', date: { $gte: now } }).sort({ date: 1 }).limit(5),
      CommitteeMeeting.countDocuments({ societyId, status: 'SCHEDULED', date: { $gte: now } }),
      CommitteeProposal.countDocuments({ societyId, status: 'OPEN_FOR_VOTING' }),
      CommitteeProposal.countDocuments({ societyId, status: 'APPROVED', approvedAt: null }),
      CommitteeDecision.countDocuments({ societyId, status: 'PENDING' }),
      CommitteeActionItem.countDocuments({ societyId, status: { $in: ['PENDING', 'IN_PROGRESS'] } }),
      AuditLog.find({ societyId, entity: { $in: ['CommitteeMember', 'CommitteeMeeting', 'CommitteeProposal', 'CommitteeDecision', 'CommitteeActionItem'] } }).sort({ createdAt: -1 }).limit(8),
      Society.findById(societyId).select('name settings')
    ]);
    const myActions = await CommitteeActionItem.countDocuments({ societyId, assignedTo: req.user._id, status: { $in: ['PENDING', 'IN_PROGRESS'] } });
    const currentTerms = members.filter((member) => new Date(member.termStart) <= now && new Date(member.termEnd) >= now);
    res.json({ success: true, data: {
      society,
      members,
      currentTerm: currentTerms.length ? { start: currentTerms.reduce((date, member) => new Date(member.termStart) < date ? new Date(member.termStart) : date, new Date(currentTerms[0].termStart)), end: currentTerms.reduce((date, member) => new Date(member.termEnd) > date ? new Date(member.termEnd) : date, new Date(currentTerms[0].termEnd)) } : null,
      activeMembers: members.length,
      upcomingMeetings,
      upcomingMeetingsCount,
      openProposals,
      pendingApprovals,
      pendingDecisions,
      pendingActionItems,
      myActionItems: myActions,
      pendingMinutes: await CommitteeMeeting.countDocuments({ societyId, status: 'COMPLETED', 'minutes.summary': '' }),
      recentActivity
    } });
  } catch (error) { next(error); }
};

export const getMembers = async (req, res, next) => {
  try {
    const { status = 'ACTIVE' } = req.query;
    const members = await CommitteeMember.find({ societyId: req.societyId, ...(status === 'ALL' ? {} : { status }) }).populate(memberPopulate).sort({ designation: 1, termStart: -1 });
    res.json({ success: true, data: members });
  } catch (error) { next(error); }
};

export const getSocietyPeople = async (req, res, next) => {
  try {
    const people = await User.find({ societyId: req.societyId, isActive: true, role: { $nin: [ROLES.SUPER_ADMIN] } })
      .select('name role avatarUrl apartmentId')
      .populate('apartmentId', 'unitNumber')
      .sort({ name: 1 });
    res.json({ success: true, data: people });
  } catch (error) { next(error); }
};

export const addMember = async (req, res, next) => {
  try {
    const { userId, designation, termStart, termEnd } = req.body;
    if (!mongoose.isValidObjectId(userId) || !committeeRoles.includes(designation) || !validDate(termStart) || !validDate(termEnd) || new Date(termEnd) < new Date(termStart)) {
      return res.status(400).json({ success: false, message: 'Choose a society user, valid governance designation, and a valid term date range.', code: 'INVALID_COMMITTEE_MEMBER' });
    }
    const user = await User.findOne({ _id: userId, societyId: req.societyId, isActive: true });
    if (!user || user.role !== designation) return res.status(400).json({ success: false, message: 'The selected active user must have the same society governance role as the designation.', code: 'MEMBER_ROLE_MISMATCH' });
    const existing = await CommitteeMember.findOne({ societyId: req.societyId, userId });
    if (existing) return res.status(409).json({ success: false, message: 'This user already has a committee record.', code: 'COMMITTEE_MEMBER_EXISTS' });
    if (await activeOfficeHolderExists(req.societyId, designation)) return res.status(409).json({ success: false, message: `An active ${designation.toLowerCase().replaceAll('_', ' ')} already exists in this society.`, code: 'OFFICE_HOLDER_EXISTS' });
    const member = await CommitteeMember.create({ societyId: req.societyId, userId, designation, termStart: new Date(termStart), termEnd: new Date(termEnd), status: 'ACTIVE' });
    await logAudit({ req, action: 'COMMITTEE_MEMBER_ADDED', entity: 'CommitteeMember', entityId: member._id, newState: { userId, designation, termStart, termEnd } });
    await notifyCommittee(req.societyId, 'Committee membership updated', `${user.name} joined the committee as ${designation.replaceAll('_', ' ').toLowerCase()}.`, '/committee/members');
    res.status(201).json({ success: true, data: await member.populate(memberPopulate) });
  } catch (error) { next(error); }
};

export const updateMember = async (req, res, next) => {
  try {
    const member = await CommitteeMember.findOne({ _id: req.params.id, societyId: req.societyId }).populate('userId');
    if (!member) return res.status(404).json({ success: false, message: 'Committee member not found.' });
    const previousState = { designation: member.designation, termStart: member.termStart, termEnd: member.termEnd, status: member.status };
    const { designation, termStart, termEnd, status } = req.body;
    if (designation && !committeeRoles.includes(designation)) return res.status(400).json({ success: false, message: 'Invalid committee designation.' });
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid membership status.' });
    const nextDesignation = designation || member.designation;
    const nextStatus = status || member.status;
    if (nextStatus === 'ACTIVE' && await activeOfficeHolderExists(req.societyId, nextDesignation, member._id)) {
      return res.status(409).json({ success: false, message: `An active ${nextDesignation.toLowerCase().replaceAll('_', ' ')} already exists in this society.`, code: 'OFFICE_HOLDER_EXISTS' });
    }
    if (termStart !== undefined && !validDate(termStart)) return res.status(400).json({ success: false, message: 'Enter a valid term start date.' });
    if (termEnd !== undefined && !validDate(termEnd)) return res.status(400).json({ success: false, message: 'Enter a valid term end date.' });
    if (termStart !== undefined) member.termStart = new Date(termStart);
    if (termEnd !== undefined) member.termEnd = new Date(termEnd);
    if (member.termEnd < member.termStart) return res.status(400).json({ success: false, message: 'Term end must be on or after term start.' });
    if (designation) {
      const rolePreviousState = { role: member.userId.role };
      member.userId.role = designation;
      await member.userId.save();
      await logAudit({ req, action: 'UPDATE_USER_ROLE', entity: 'User', entityId: member.userId._id, previousState: rolePreviousState, newState: { role: designation } });
      member.designation = designation;
    }
    if (status) member.status = status;
    await member.save();
    if (status === 'INACTIVE' && committeeRoles.includes(member.userId.role)) {
      const rolePreviousState = { role: member.userId.role };
      member.userId.role = ROLES.RESIDENT;
      await member.userId.save();
      await logAudit({ req, action: 'UPDATE_USER_ROLE', entity: 'User', entityId: member.userId._id, previousState: rolePreviousState, newState: { role: member.userId.role, reason: 'COMMITTEE_MEMBERSHIP_DEACTIVATED' } });
    }
    await logAudit({ req, action: status === 'INACTIVE' ? 'COMMITTEE_MEMBER_REMOVED' : 'COMMITTEE_MEMBER_UPDATED', entity: 'CommitteeMember', entityId: member._id, previousState, newState: { designation: member.designation, termStart: member.termStart, termEnd: member.termEnd, status: member.status } });
    res.json({ success: true, data: await member.populate(memberPopulate) });
  } catch (error) { next(error); }
};

export const getMeetings = async (req, res, next) => {
  try {
    const meetings = await CommitteeMeeting.find({ societyId: req.societyId }).populate('participants', 'name role avatarUrl').populate('createdBy', 'name role').sort({ date: 1 });
    res.json({ success: true, data: meetings });
  } catch (error) { next(error); }
};

export const createMeeting = async (req, res, next) => {
  try {
    const { title, description = '', date, startTime, endTime = '', location = '', agenda = [], participants = [] } = req.body;
    if (!title?.trim() || !validDate(date) || !ensureDateTimeRange(startTime, endTime)) return res.status(400).json({ success: false, message: 'Title, a valid date and start time are required. End time must be later than start time.', code: 'INVALID_MEETING' });
    const users = await validateSocietyUsers(req.societyId, normalizeIds(participants));
    if (!users) return res.status(400).json({ success: false, message: 'Every participant must be an active user in this society.', code: 'INVALID_PARTICIPANTS' });
    const meeting = await CommitteeMeeting.create({ societyId: req.societyId, title: title.trim(), description, date: new Date(date), startTime, endTime, location, agenda: listField(agenda), participants: users.map((user) => user._id), attachments: attachmentUrls(req.files), createdBy: req.user._id });
    await logAudit({ req, action: 'MEETING_CREATED', entity: 'CommitteeMeeting', entityId: meeting._id, newState: { title: meeting.title, date: meeting.date, participants: meeting.participants } });
    await notifyUsers(req.societyId, meeting.participants, 'Committee meeting scheduled', `${meeting.title} is scheduled for ${new Date(meeting.date).toLocaleDateString()}.`, `/committee/meetings/${meeting._id}`, { meetingId: meeting._id });
    res.status(201).json({ success: true, data: await meeting.populate([{ path: 'participants', select: 'name role avatarUrl' }, { path: 'createdBy', select: 'name role' }]) });
  } catch (error) { next(error); }
};

export const getMeeting = async (req, res, next) => {
  try {
    const meeting = await CommitteeMeeting.findOne({ _id: req.params.id, societyId: req.societyId }).populate('participants', 'name email role avatarUrl').populate('createdBy', 'name role');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    const [decisions, actionItems, activity] = await Promise.all([
      CommitteeDecision.find({ societyId: req.societyId, meetingId: meeting._id }).populate('responsiblePersonId', 'name role'),
      CommitteeActionItem.find({ societyId: req.societyId, meetingId: meeting._id }).populate('assignedTo', 'name role'),
      AuditLog.find({ societyId: req.societyId, entity: 'CommitteeMeeting', entityId: meeting._id.toString() }).sort({ createdAt: -1 }).limit(30)
    ]);
    res.json({ success: true, data: { meeting, decisions, actionItems, activity } });
  } catch (error) { next(error); }
};

export const updateMeeting = async (req, res, next) => {
  try {
    const meeting = await CommitteeMeeting.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    const previousState = meeting.toObject();
    const { title, description, date, startTime, endTime, location, agenda, participants, status } = req.body;
    if (date !== undefined && !validDate(date)) return res.status(400).json({ success: false, message: 'Enter a valid meeting date.' });
    const nextStart = startTime ?? meeting.startTime;
    const nextEnd = endTime ?? meeting.endTime;
    if (!ensureDateTimeRange(nextStart, nextEnd)) return res.status(400).json({ success: false, message: 'Enter valid meeting times. End time must be later than start time.' });
    if (participants !== undefined) {
      const users = await validateSocietyUsers(req.societyId, normalizeIds(participants));
      if (!users) return res.status(400).json({ success: false, message: 'Every participant must be an active user in this society.' });
      meeting.participants = users.map((user) => user._id);
    }
    if (title !== undefined) meeting.title = title.trim();
    if (description !== undefined) meeting.description = description;
    if (date !== undefined) meeting.date = new Date(date);
    if (startTime !== undefined) meeting.startTime = startTime;
    if (endTime !== undefined) meeting.endTime = endTime;
    if (location !== undefined) meeting.location = location;
    if (agenda !== undefined) meeting.agenda = listField(agenda);
    if (status !== undefined) {
      if (!['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid meeting status.' });
      meeting.status = status;
    }
    await meeting.save();
    await logAudit({ req, action: 'MEETING_UPDATED', entity: 'CommitteeMeeting', entityId: meeting._id, previousState, newState: meeting.toObject() });
    res.json({ success: true, data: meeting });
  } catch (error) { next(error); }
};

export const recordMinutes = async (req, res, next) => {
  try {
    const meeting = await CommitteeMeeting.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    const { summary = '', discussionPoints = [], decisions = [], notes = '' } = req.body;
    if (![summary, notes].some((value) => String(value).trim()) && !listField(discussionPoints).length && !listField(decisions).length) return res.status(400).json({ success: false, message: 'Add a summary, discussion point, decision, or note before saving minutes.' });
    const previousState = meeting.minutes?.toObject?.() || null;
    meeting.minutes = { summary, discussionPoints: listField(discussionPoints), decisions: listField(decisions), notes, recordedBy: req.user._id, recordedAt: new Date() };
    if (meeting.status === 'SCHEDULED' || meeting.status === 'ONGOING') meeting.status = 'COMPLETED';
    await meeting.save();
    await logAudit({ req, action: 'MEETING_MINUTES_RECORDED', entity: 'CommitteeMeeting', entityId: meeting._id, previousState, newState: meeting.minutes.toObject() });
    await notifyCommittee(req.societyId, 'Meeting minutes recorded', `Minutes are available for ${meeting.title}.`, `/committee/meetings/${meeting._id}`, { meetingId: meeting._id });
    res.json({ success: true, data: meeting });
  } catch (error) { next(error); }
};

const addProposalVoteSummary = async (req, proposals) => {
  if (!proposals.length) return [];
  const votes = await CommitteeVote.find({ proposalId: { $in: proposals.map((proposal) => proposal._id) }, societyId: req.societyId }).select('proposalId userId vote');
  const byProposal = new Map();
  for (const vote of votes) {
    const key = vote.proposalId.toString();
    const summary = byProposal.get(key) || { YES: 0, NO: 0, ABSTAIN: 0, total: 0, myVote: null };
    summary[vote.vote] += 1;
    summary.total += 1;
    if (vote.userId.toString() === req.user._id.toString()) summary.myVote = vote.vote;
    byProposal.set(key, summary);
  }
  return proposals.map((proposal) => ({ ...proposal.toObject(), voteSummary: byProposal.get(proposal._id.toString()) || { YES: 0, NO: 0, ABSTAIN: 0, total: 0, myVote: null } }));
};

export const getProposals = async (req, res, next) => {
  try {
    const proposals = await CommitteeProposal.find({ societyId: req.societyId }).populate('createdBy', 'name role').sort({ createdAt: -1 });
    res.json({ success: true, data: await addProposalVoteSummary(req, proposals) });
  } catch (error) { next(error); }
};

export const createProposal = async (req, res, next) => {
  try {
    const { title, description, category = 'OTHER', votingStart, votingEnd } = req.body;
    if (!title?.trim() || !description?.trim()) return res.status(400).json({ success: false, message: 'Proposal title and description are required.' });
    if ((votingStart && !validDate(votingStart)) || (votingEnd && !validDate(votingEnd)) || (votingStart && votingEnd && new Date(votingEnd) <= new Date(votingStart))) return res.status(400).json({ success: false, message: 'Voting end must be later than voting start.' });
    const proposal = await CommitteeProposal.create({ societyId: req.societyId, title: title.trim(), description: description.trim(), category, createdBy: req.user._id, attachments: attachmentUrls(req.files), votingStart: votingStart ? new Date(votingStart) : null, votingEnd: votingEnd ? new Date(votingEnd) : null, status: 'DRAFT' });
    await logAudit({ req, action: 'PROPOSAL_CREATED', entity: 'CommitteeProposal', entityId: proposal._id, newState: { title: proposal.title, category } });
    res.status(201).json({ success: true, data: proposal });
  } catch (error) { next(error); }
};

export const getProposal = async (req, res, next) => {
  try {
    const proposal = await CommitteeProposal.findOne({ _id: req.params.id, societyId: req.societyId }).populate('createdBy', 'name role');
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    const [proposalWithSummary, activity, decisions] = await Promise.all([
      addProposalVoteSummary(req, [proposal]),
      AuditLog.find({ societyId: req.societyId, entity: 'CommitteeProposal', entityId: proposal._id.toString() }).sort({ createdAt: -1 }).limit(30),
      CommitteeDecision.find({ societyId: req.societyId, proposalId: proposal._id }).populate('responsiblePersonId', 'name role')
    ]);
    res.json({ success: true, data: { ...proposalWithSummary[0], activity, decisions } });
  } catch (error) { next(error); }
};

export const publishProposal = async (req, res, next) => {
  try {
    const proposal = await CommitteeProposal.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    if (proposal.status !== 'DRAFT') return res.status(409).json({ success: false, message: 'Only a draft proposal can be published.' });
    if (!validDate(proposal.votingStart) || !validDate(proposal.votingEnd) || new Date(proposal.votingEnd) <= new Date(proposal.votingStart)) return res.status(400).json({ success: false, message: 'Set a valid voting start and end before publishing.' });
    if (new Date(proposal.votingEnd) <= new Date()) return res.status(400).json({ success: false, message: 'Voting end must be in the future.' });
    const previousState = { status: proposal.status };
    proposal.status = 'OPEN_FOR_VOTING';
    await proposal.save();
    await logAudit({ req, action: 'PROPOSAL_PUBLISHED', entity: 'CommitteeProposal', entityId: proposal._id, previousState, newState: { status: proposal.status, votingStart: proposal.votingStart, votingEnd: proposal.votingEnd } });
    await notifyCommittee(req.societyId, 'Proposal open for voting', `${proposal.title} is open for committee voting.`, `/committee/proposals/${proposal._id}`, { proposalId: proposal._id });
    res.json({ success: true, data: proposal });
  } catch (error) { next(error); }
};

export const castProposalVote = async (req, res, next) => {
  try {
    const { vote } = req.body;
    if (!['YES', 'NO', 'ABSTAIN'].includes(vote)) return res.status(400).json({ success: false, message: 'Vote must be YES, NO, or ABSTAIN.' });
    const member = await CommitteeMember.findOne({ societyId: req.societyId, userId: req.user._id, status: 'ACTIVE', termStart: { $lte: new Date() }, termEnd: { $gte: new Date() } });
    if (!member || !committeeRoles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Only an active committee member can vote.', code: 'COMMITTEE_MEMBERSHIP_REQUIRED' });
    const proposal = await CommitteeProposal.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    const now = new Date();
    if (proposal.status !== 'OPEN_FOR_VOTING' || now < proposal.votingStart || now > proposal.votingEnd) {
      if (proposal.status === 'OPEN_FOR_VOTING' && now > proposal.votingEnd) await closeProposal(proposal, await Society.findById(req.societyId), req);
      return res.status(409).json({ success: false, message: 'Voting is not currently open for this proposal.', code: 'VOTING_CLOSED' });
    }
    try {
      const record = await CommitteeVote.create({ societyId: req.societyId, proposalId: proposal._id, userId: req.user._id, vote });
      await logAudit({ req, action: 'PROPOSAL_VOTE_CAST', entity: 'CommitteeProposal', entityId: proposal._id, newState: { vote } });
      res.status(201).json({ success: true, data: record, message: 'Your vote has been recorded.' });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ success: false, message: 'Your vote has already been recorded and cannot be changed.', code: 'ALREADY_VOTED' });
      throw error;
    }
  } catch (error) { next(error); }
};

export const closeProposalVoting = async (req, res, next) => {
  try {
    const proposal = await CommitteeProposal.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    if (proposal.status !== 'OPEN_FOR_VOTING') return res.status(409).json({ success: false, message: 'Proposal voting is already closed.' });
    if (new Date() < proposal.votingEnd) return res.status(400).json({ success: false, message: 'Voting can close only after the configured end time.' });
    const updated = await closeProposal(proposal, await Society.findById(req.societyId), req);
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const approveProposal = async (req, res, next) => {
  try {
    const proposal = await CommitteeProposal.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    if (proposal.status !== 'APPROVED' || proposal.result?.outcome !== 'APPROVED') return res.status(409).json({ success: false, message: 'Only a proposal approved by committee voting can receive chairman confirmation.' });
    if (proposal.approvedAt) return res.status(409).json({ success: false, message: 'Chairman confirmation is already recorded.' });
    proposal.approvedAt = new Date();
    await proposal.save();
    await logAudit({ req, action: 'PROPOSAL_APPROVAL_CONFIRMED', entity: 'CommitteeProposal', entityId: proposal._id, newState: { approvedAt: proposal.approvedAt } });
    res.json({ success: true, data: proposal, message: 'Proposal confirmation recorded.' });
  } catch (error) { next(error); }
};

export const cancelProposal = async (req, res, next) => {
  try {
    const proposal = await CommitteeProposal.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    if (!['DRAFT', 'OPEN_FOR_VOTING'].includes(proposal.status)) return res.status(409).json({ success: false, message: 'A completed proposal cannot be cancelled.' });
    const voteCount = await CommitteeVote.countDocuments({ proposalId: proposal._id, societyId: req.societyId });
    if (voteCount > 0) return res.status(409).json({ success: false, message: 'A proposal cannot be cancelled after committee voting has started.' });
    const previousState = { status: proposal.status };
    proposal.status = 'CANCELLED';
    await proposal.save();
    await logAudit({ req, action: 'PROPOSAL_CANCELLED', entity: 'CommitteeProposal', entityId: proposal._id, previousState, newState: { status: proposal.status } });
    await notifyCommittee(req.societyId, 'Proposal cancelled', `${proposal.title} was cancelled before voting began.`, `/committee/proposals/${proposal._id}`, { proposalId: proposal._id });
    res.json({ success: true, data: proposal });
  } catch (error) { next(error); }
};

export const getDecisions = async (req, res, next) => {
  try {
    const decisions = await CommitteeDecision.find({ societyId: req.societyId }).populate('responsiblePersonId', 'name role avatarUrl').populate('createdBy', 'name role').populate('meetingId', 'title date').populate('proposalId', 'title status').sort({ deadline: 1, createdAt: -1 });
    const logs = decisions.length ? await AuditLog.find({ societyId: req.societyId, entity: 'CommitteeDecision', entityId: { $in: decisions.map((decision) => decision._id.toString()) } }).sort({ createdAt: -1 }) : [];
    const groupedLogs = logs.reduce((map, log) => { map[log.entityId] ||= []; map[log.entityId].push(log); return map; }, {});
    res.json({ success: true, data: decisions.map((decision) => ({ ...decision.toObject(), activity: groupedLogs[decision._id.toString()] || [] })) });
  } catch (error) { next(error); }
};

export const createDecision = async (req, res, next) => {
  try {
    const { title, description = '', meetingId, proposalId, responsiblePersonId, deadline } = req.body;
    if (!title?.trim() || !mongoose.isValidObjectId(responsiblePersonId) || (deadline && !validDate(deadline))) return res.status(400).json({ success: false, message: 'A title, responsible society user, and valid optional deadline are required.' });
    const [user, meeting, proposal] = await Promise.all([
      User.findOne({ _id: responsiblePersonId, societyId: req.societyId, isActive: true }),
      meetingId ? CommitteeMeeting.findOne({ _id: meetingId, societyId: req.societyId }) : null,
      proposalId ? CommitteeProposal.findOne({ _id: proposalId, societyId: req.societyId, status: 'APPROVED' }) : null
    ]);
    if (!user || (meetingId && !meeting) || (proposalId && !proposal)) return res.status(400).json({ success: false, message: 'The responsible person and linked meeting or approved proposal must belong to this society.' });
    const decision = await CommitteeDecision.create({ societyId: req.societyId, title: title.trim(), description, meetingId: meeting?._id || null, proposalId: proposal?._id || null, responsiblePersonId: user._id, deadline: deadline ? new Date(deadline) : null, createdBy: req.user._id, attachments: attachmentUrls(req.files) });
    await logAudit({ req, action: 'DECISION_CREATED', entity: 'CommitteeDecision', entityId: decision._id, newState: { title: decision.title, responsiblePersonId: user._id } });
    await notifyUsers(req.societyId, [user._id], 'Governance decision assigned', decision.title, '/committee/decisions', { decisionId: decision._id });
    res.status(201).json({ success: true, data: await decision.populate([{ path: 'responsiblePersonId', select: 'name role' }, { path: 'createdBy', select: 'name role' }]) });
  } catch (error) { next(error); }
};

export const updateDecisionStatus = async (req, res, next) => {
  try {
    const decision = await CommitteeDecision.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!decision) return res.status(404).json({ success: false, message: 'Decision not found.' });
    const isSocietyOfficer = req.user.role !== ROLES.SUPER_ADMIN;
    if (!isSocietyOfficer || (!canCreateDecision(req.user) && decision.responsiblePersonId.toString() !== req.user._id.toString())) return res.status(403).json({ success: false, message: 'Only the responsible person or governance lead can update this decision.' });
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid decision status.' });
    const previousState = { status: decision.status };
    decision.status = req.body.status;
    await decision.save();
    await logAudit({ req, action: 'DECISION_STATUS_UPDATED', entity: 'CommitteeDecision', entityId: decision._id, previousState, newState: { status: decision.status } });
    res.json({ success: true, data: decision });
  } catch (error) { next(error); }
};

export const getActionItems = async (req, res, next) => {
  try {
    const query = { societyId: req.societyId };
    if (!canManageGovernance(req.user) && !hasPermission(req.user, 'APPROVE_PROPOSAL')) {
      const [participatingMeetings, responsibleDecisions] = await Promise.all([
        CommitteeMeeting.find({ societyId: req.societyId, participants: req.user._id }).select('_id'),
        CommitteeDecision.find({ societyId: req.societyId, responsiblePersonId: req.user._id }).select('_id')
      ]);
      query.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id },
        { meetingId: { $in: participatingMeetings.map((meeting) => meeting._id) } },
        { decisionId: { $in: responsibleDecisions.map((decision) => decision._id) } }
      ];
    }
    const items = await CommitteeActionItem.find(query).populate('assignedTo', 'name role avatarUrl').populate('createdBy', 'name role').populate('meetingId', 'title date').populate('decisionId', 'title status').sort({ deadline: 1, createdAt: -1 });
    const logs = items.length ? await AuditLog.find({ societyId: req.societyId, entity: 'CommitteeActionItem', entityId: { $in: items.map((item) => item._id.toString()) } }).sort({ createdAt: -1 }) : [];
    const groupedLogs = logs.reduce((map, log) => { map[log.entityId] ||= []; map[log.entityId].push(log); return map; }, {});
    res.json({ success: true, data: items.map((item) => ({ ...item.toObject(), activity: groupedLogs[item._id.toString()] || [] })) });
  } catch (error) { next(error); }
};

export const createActionItem = async (req, res, next) => {
  try {
    const { title, description = '', assignedTo, meetingId, decisionId, deadline, priority = 'MEDIUM' } = req.body;
    if (!title?.trim() || !mongoose.isValidObjectId(assignedTo) || (deadline && !validDate(deadline)) || !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) return res.status(400).json({ success: false, message: 'Provide a title, valid society assignee, valid deadline, and supported priority.' });
    const [users, meeting, decision] = await Promise.all([
      validateSocietyUsers(req.societyId, [assignedTo]),
      meetingId ? CommitteeMeeting.findOne({ _id: meetingId, societyId: req.societyId }) : null,
      decisionId ? CommitteeDecision.findOne({ _id: decisionId, societyId: req.societyId }) : null
    ]);
    if (!users || (meetingId && !meeting) || (decisionId && !decision)) return res.status(400).json({ success: false, message: 'The assignee and linked records must belong to this society.' });
    const item = await CommitteeActionItem.create({ societyId: req.societyId, title: title.trim(), description, assignedTo, createdBy: req.user._id, meetingId: meeting?._id || null, decisionId: decision?._id || null, deadline: deadline ? new Date(deadline) : null, priority, attachments: attachmentUrls(req.files) });
    await logAudit({ req, action: 'ACTION_ITEM_CREATED', entity: 'CommitteeActionItem', entityId: item._id, newState: { title: item.title, assignedTo: item.assignedTo, deadline: item.deadline } });
    await notifyUsers(req.societyId, [assignedTo], 'Action item assigned', item.title, '/committee/action-items', { actionItemId: item._id });
    res.status(201).json({ success: true, data: await item.populate([{ path: 'assignedTo', select: 'name role avatarUrl' }, { path: 'createdBy', select: 'name role' }]) });
  } catch (error) { next(error); }
};

export const updateActionItem = async (req, res, next) => {
  try {
    const item = await CommitteeActionItem.findOne({ _id: req.params.id, societyId: req.societyId });
    if (!item) return res.status(404).json({ success: false, message: 'Action item not found.' });
    const previousState = { status: item.status, priority: item.priority, assignedTo: item.assignedTo, deadline: item.deadline };
    const isSocietyOfficer = req.user.role !== ROLES.SUPER_ADMIN;
    const isManager = isSocietyOfficer && (canManageGovernance(req.user) || hasPermission(req.user, 'APPROVE_PROPOSAL'));
    const isAssigned = isSocietyOfficer && item.assignedTo.toString() === req.user._id.toString();
    if (!isManager && !isAssigned) return res.status(403).json({ success: false, message: 'Only the assigned user or governance lead can update this action item.' });
    const { status, priority, deadline, assignedTo, title, description } = req.body;
    if (status && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid action item status.' });
    if (!isManager && [priority, deadline, assignedTo, title, description].some((value) => value !== undefined)) return res.status(403).json({ success: false, message: 'Assigned users can update status only.' });
    if (assignedTo !== undefined) {
      const users = await validateSocietyUsers(req.societyId, [assignedTo]);
      if (!users) return res.status(400).json({ success: false, message: 'Assignee must be an active user in this society.' });
      item.assignedTo = assignedTo;
    }
    if (priority !== undefined) {
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) return res.status(400).json({ success: false, message: 'Invalid action item priority.' });
      item.priority = priority;
    }
    if (deadline !== undefined) {
      if (deadline && !validDate(deadline)) return res.status(400).json({ success: false, message: 'Enter a valid deadline.' });
      item.deadline = deadline ? new Date(deadline) : null;
    }
    if (title !== undefined) item.title = title.trim();
    if (description !== undefined) item.description = description;
    if (status) item.status = status;
    await item.save();
    await logAudit({ req, action: status === 'COMPLETED' ? 'ACTION_ITEM_COMPLETED' : 'ACTION_ITEM_UPDATED', entity: 'CommitteeActionItem', entityId: item._id, previousState, newState: item.toObject() });
    res.json({ success: true, data: await item.populate('assignedTo', 'name role avatarUrl') });
  } catch (error) { next(error); }
};

export const processExpiredProposals = async () => {
  const now = new Date();
  const expired = await CommitteeProposal.find({ status: 'OPEN_FOR_VOTING', votingEnd: { $lte: now } }).populate('createdBy');
  for (const proposal of expired) {
    const society = await Society.findById(proposal.societyId);
    await closeProposal(proposal, society);
  }
};
