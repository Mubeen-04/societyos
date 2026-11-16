import request from 'supertest';
import app from '../src/app.js';
import { disconnectDB } from '../src/config/db.js';
import { runSeed } from '../seeds/seed.js';
import { CommitteeMember } from '../src/models/CommitteeMember.js';
import { CommitteeProposal } from '../src/models/CommitteeProposal.js';
import { User } from '../src/models/User.js';

const accounts = {
  superAdmin: 'superadmin@societyos.com',
  admin: 'mubeen.shaikh@societyos.com',
  chairman: 'kavita.desai@societyos.com',
  secretary: 'rohan.iyer@societyos.com',
  treasurer: 'nisha.rao@societyos.com',
  member: 'aarav.mehta@societyos.com',
  resident: 'priya.sharma@societyos.com',
  security: 'ramesh.pawar@societyos.com',
  vendor: 'rajesh.plumber@societyos.com'
};

const login = async (email) => {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  expect(response.status).toBe(200);
  return { token: response.body.data.token, user: response.body.data.user };
};

let sessions;
let createdMeetingId;

beforeAll(async () => {
  await runSeed();
  sessions = {};
  for (const [key, email] of Object.entries(accounts)) sessions[key] = await login(email);
}, 90000);

afterAll(async () => { await disconnectDB(); });

describe('Committee governance access control', () => {
  test('Only governance viewers can read committee overview and meetings', async () => {
    for (const role of ['superAdmin', 'admin', 'chairman', 'secretary', 'treasurer', 'member']) {
      const response = await request(app).get('/api/committee/overview').set('Authorization', `Bearer ${sessions[role].token}`);
      expect(response.status).toBe(200);
    }
    for (const role of ['resident', 'security', 'vendor']) {
      const response = await request(app).get('/api/committee/meetings').set('Authorization', `Bearer ${sessions[role].token}`);
      expect(response.status).toBe(403);
    }
  });

  test('Secretary can schedule a meeting; Admin, Chairman, Super Admin, and Vendor cannot', async () => {
    const body = {
      title: 'Governance workflow test meeting',
      description: 'API test meeting',
      date: new Date(Date.now() + 3 * 86400000).toISOString(),
      startTime: '18:00',
      endTime: '19:00',
      location: 'Clubhouse',
      agenda: ['Review proposal'],
      participants: [sessions.chairman.user.id, sessions.member.user.id]
    };
    const created = await request(app).post('/api/committee/meetings').set('Authorization', `Bearer ${sessions.secretary.token}`).send(body);
    expect(created.status).toBe(201);
    createdMeetingId = created.body.data._id;
    expect(created.body.data.participants).toHaveLength(2);

    for (const role of ['admin', 'chairman', 'superAdmin', 'vendor']) {
      const response = await request(app).post('/api/committee/meetings').set('Authorization', `Bearer ${sessions[role].token}`).send(body);
      expect(response.status).toBe(403);
    }

    const invalidParticipant = await request(app).post('/api/committee/meetings').set('Authorization', `Bearer ${sessions.secretary.token}`).send({ ...body, participants: ['507f1f77bcf86cd799439011'] });
    expect(invalidParticipant.status).toBe(400);
    const invalidTimes = await request(app).post('/api/committee/meetings').set('Authorization', `Bearer ${sessions.secretary.token}`).send({ ...body, endTime: '17:00' });
    expect(invalidTimes.status).toBe(400);
  });

  test('Secretary can record meeting minutes and create an auditable decision trail', async () => {
    const minutes = await request(app).patch(`/api/committee/meetings/${createdMeetingId}/minutes`).set('Authorization', `Bearer ${sessions.secretary.token}`).send({ summary: 'Budget review completed.', discussionPoints: ['Camera locations', 'Vendor pricing'], decisions: ['Collect updated quotes'], notes: 'Review next month.' });
    expect(minutes.status).toBe(200);
    expect(minutes.body.data.status).toBe('COMPLETED');
    expect(minutes.body.data.minutes.decisions).toContain('Collect updated quotes');

    const denied = await request(app).patch(`/api/committee/meetings/${createdMeetingId}/minutes`).set('Authorization', `Bearer ${sessions.admin.token}`).send({ summary: 'Admin cannot record governance minutes.' });
    expect(denied.status).toBe(403);
  });

  test('Voting requires active committee membership and prevents repeat votes', async () => {
    const proposals = await request(app).get('/api/committee/proposals').set('Authorization', `Bearer ${sessions.member.token}`);
    const openProposal = proposals.body.data.find((proposal) => proposal.status === 'OPEN_FOR_VOTING');
    expect(openProposal).toBeDefined();

    const duplicate = await request(app).post(`/api/committee/proposals/${openProposal._id}/vote`).set('Authorization', `Bearer ${sessions.member.token}`).send({ vote: 'NO' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('ALREADY_VOTED');

    for (const role of ['admin', 'resident', 'security', 'vendor']) {
      const denied = await request(app).post(`/api/committee/proposals/${openProposal._id}/vote`).set('Authorization', `Bearer ${sessions[role].token}`).send({ vote: 'YES' });
      expect(denied.status).toBe(403);
    }

    const superAdmin = await request(app).post(`/api/committee/proposals/${openProposal._id}/vote`).set('Authorization', `Bearer ${sessions.superAdmin.token}`).send({ vote: 'YES' });
    expect(superAdmin.status).toBe(403);

    for (const role of ['chairman', 'secretary', 'treasurer']) {
      const eligibleDuplicate = await request(app).post(`/api/committee/proposals/${openProposal._id}/vote`).set('Authorization', `Bearer ${sessions[role].token}`).send({ vote: 'YES' });
      expect(eligibleDuplicate.status).toBe(409);
      expect(eligibleDuplicate.body.code).toBe('ALREADY_VOTED');
    }
  });

  test('Proposal draft publishes, accepts one eligible vote, and closes using the configured threshold', async () => {
    const proposal = await request(app).post('/api/committee/proposals').set('Authorization', `Bearer ${sessions.secretary.token}`).send({
      title: 'Governance API voting workflow', description: 'Exercise configured vote closure.', category: 'POLICY',
      votingStart: new Date(Date.now() - 60_000).toISOString(), votingEnd: new Date(Date.now() + 86400000).toISOString()
    });
    expect(proposal.status).toBe(201);
    const published = await request(app).patch(`/api/committee/proposals/${proposal.body.data._id}/publish`).set('Authorization', `Bearer ${sessions.secretary.token}`);
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('OPEN_FOR_VOTING');

    const vote = await request(app).post(`/api/committee/proposals/${proposal.body.data._id}/vote`).set('Authorization', `Bearer ${sessions.member.token}`).send({ vote: 'YES' });
    expect(vote.status).toBe(201);
    const repeated = await request(app).post(`/api/committee/proposals/${proposal.body.data._id}/vote`).set('Authorization', `Bearer ${sessions.member.token}`).send({ vote: 'NO' });
    expect(repeated.status).toBe(409);

    await CommitteeProposal.findByIdAndUpdate(proposal.body.data._id, { votingEnd: new Date(Date.now() - 1000) });
    const closed = await request(app).post(`/api/committee/proposals/${proposal.body.data._id}/close`).set('Authorization', `Bearer ${sessions.chairman.token}`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('APPROVED');
    expect(closed.body.data.result).toMatchObject({ yes: 1, no: 0, total: 1, approvalThreshold: 0.5 });
  });

  test('Only Chairman can confirm an approved proposal; Admin and Committee Member cannot', async () => {
    const approved = await CommitteeProposal.findOne({ status: 'APPROVED' });
    expect(approved).toBeTruthy();
    for (const role of ['admin', 'member', 'secretary', 'superAdmin']) {
      const denied = await request(app).post(`/api/committee/proposals/${approved._id}/approve`).set('Authorization', `Bearer ${sessions[role].token}`);
      expect(denied.status).toBe(403);
    }
    const chairman = await request(app).post(`/api/committee/proposals/${approved._id}/approve`).set('Authorization', `Bearer ${sessions.chairman.token}`);
    expect(chairman.status).toBe(200);
  });

  test('Secretary and Chairman can create decisions, while Admin and Committee Member cannot', async () => {
    const body = { title: 'Governance API test decision', description: 'Test', responsiblePersonId: sessions.admin.user.id };
    const secretary = await request(app).post('/api/committee/decisions').set('Authorization', `Bearer ${sessions.secretary.token}`).send(body);
    expect(secretary.status).toBe(201);
    const chairman = await request(app).post('/api/committee/decisions').set('Authorization', `Bearer ${sessions.chairman.token}`).send(body);
    expect(chairman.status).toBe(201);
    for (const role of ['admin', 'member', 'superAdmin']) {
      const denied = await request(app).post('/api/committee/decisions').set('Authorization', `Bearer ${sessions[role].token}`).send(body);
      expect(denied.status).toBe(403);
    }
  });

  test('Assigned Admin can update operational follow-up but cannot create governance action items', async () => {
    const list = await request(app).get('/api/committee/action-items').set('Authorization', `Bearer ${sessions.admin.token}`);
    expect(list.status).toBe(200);
    const assigned = list.body.data.find((item) => item.assignedTo._id === sessions.admin.user.id);
    expect(assigned).toBeDefined();
    const updated = await request(app).patch(`/api/committee/action-items/${assigned._id}`).set('Authorization', `Bearer ${sessions.admin.token}`).send({ status: 'COMPLETED' });
    expect(updated.status).toBe(200);

    const create = await request(app).post('/api/committee/action-items').set('Authorization', `Bearer ${sessions.admin.token}`).send({ title: 'Unauthorized item', assignedTo: sessions.admin.user.id });
    expect(create.status).toBe(403);
  });

  test('Manual membership deactivation removes active governance roles and preserves platform roles', async () => {
    const societyId = sessions.admin.user.societyId;
    const deactivateMembership = (memberId) => request(app)
      .patch(`/api/committee/members/${memberId}`)
      .set('Authorization', `Bearer ${sessions.admin.token}`)
      .send({ status: 'INACTIVE' });

    for (const [sessionKey, expectedGovernanceRole] of [['chairman', 'CHAIRMAN'], ['treasurer', 'TREASURER'], ['member', 'COMMITTEE_MEMBER']]) {
      const memberSession = sessions[sessionKey];
      const membership = await CommitteeMember.findOne({ societyId, userId: memberSession.user.id, status: 'ACTIVE' });
      expect(membership).toBeTruthy();
      expect((await User.findById(memberSession.user.id)).role).toBe(expectedGovernanceRole);

      const response = await deactivateMembership(membership._id);
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('INACTIVE');
      expect((await User.findById(memberSession.user.id)).role).toBe('RESIDENT');
    }

    for (const [sessionKey, platformRole] of [['admin', 'ADMIN'], ['superAdmin', 'SUPER_ADMIN']]) {
      const platformUser = await User.findById(sessions[sessionKey].user.id);
      const membership = await CommitteeMember.create({
        societyId,
        userId: platformUser._id,
        designation: 'COMMITTEE_MEMBER',
        termStart: new Date(),
        termEnd: new Date(Date.now() + 365 * 86400000),
        status: 'ACTIVE'
      });
      const response = await deactivateMembership(membership._id);
      expect(response.status).toBe(200);
      expect((await CommitteeMember.findById(membership._id)).status).toBe('INACTIVE');
      expect((await User.findById(platformUser._id)).role).toBe(platformRole);
    }
  });

  test('Role changes synchronize committee membership and enforce one active office holder', async () => {
    const assignRole = (userId, role) => request(app)
      .patch(`/api/societies/users/${userId}/role`)
      .set('Authorization', `Bearer ${sessions.admin.token}`)
      .send({ role });

    const demote = await assignRole(sessions.chairman.user.id, 'RESIDENT');
    expect(demote.status).toBe(200);
    let chairmanMembership = await CommitteeMember.findOne({ societyId: sessions.admin.user.societyId, userId: sessions.chairman.user.id });
    expect(chairmanMembership.status).toBe('INACTIVE');

    const promoteChairman = await assignRole(sessions.resident.user.id, 'CHAIRMAN');
    expect(promoteChairman.status).toBe(200);
    chairmanMembership = await CommitteeMember.findOne({ societyId: sessions.admin.user.societyId, userId: sessions.resident.user.id });
    expect(chairmanMembership).toMatchObject({ designation: 'CHAIRMAN', status: 'ACTIVE' });
    expect(chairmanMembership.termEnd.getFullYear()).toBeGreaterThan(chairmanMembership.termStart.getFullYear());

    await assignRole(sessions.security.user.id, 'RESIDENT');
    const secondChairman = await assignRole(sessions.security.user.id, 'CHAIRMAN');
    expect(secondChairman.status).toBe(409);
    expect(secondChairman.body.code).toBe('OFFICE_HOLDER_EXISTS');

    const demoteTreasurer = await assignRole(sessions.treasurer.user.id, 'RESIDENT');
    expect(demoteTreasurer.status).toBe(200);
    const promoteTreasurer = await assignRole(sessions.vendor.user.id, 'TREASURER');
    expect(promoteTreasurer.status).toBe(200);
    const secondTreasurer = await assignRole(sessions.security.user.id, 'TREASURER');
    expect(secondTreasurer.status).toBe(409);
    expect(secondTreasurer.body.code).toBe('OFFICE_HOLDER_EXISTS');

    await assignRole(sessions.security.user.id, 'RESIDENT');
    const firstMember = await assignRole(sessions.security.user.id, 'COMMITTEE_MEMBER');
    expect(firstMember.status).toBe(200);
    await assignRole(sessions.vendor.user.id, 'RESIDENT');
    const secondMember = await assignRole(sessions.vendor.user.id, 'COMMITTEE_MEMBER');
    expect(secondMember.status).toBe(200);
    expect(await CommitteeMember.countDocuments({ societyId: sessions.admin.user.societyId, designation: 'COMMITTEE_MEMBER', status: 'ACTIVE' })).toBeGreaterThanOrEqual(3);

    const membership = await CommitteeMember.findOne({ societyId: sessions.admin.user.societyId, userId: sessions.security.user.id });
    const demoteSecretary = await assignRole(sessions.secretary.user.id, 'RESIDENT');
    expect(demoteSecretary.status).toBe(200);
    const designationChange = await request(app)
      .patch(`/api/committee/members/${membership._id}`)
      .set('Authorization', `Bearer ${sessions.admin.token}`)
      .send({ designation: 'SECRETARY' });
    expect(designationChange.status).toBe(200);
    expect((await User.findById(sessions.security.user.id)).role).toBe('SECRETARY');
    expect((await CommitteeMember.findById(membership._id)).designation).toBe('SECRETARY');

    const roleChangeBack = await assignRole(sessions.security.user.id, 'RESIDENT');
    expect(roleChangeBack.status).toBe(200);
    expect((await CommitteeMember.findById(membership._id)).status).toBe('INACTIVE');
  });

  test('Super Admin cannot manage society committee membership', async () => {
    const response = await request(app)
      .post('/api/committee/members')
      .set('Authorization', `Bearer ${sessions.superAdmin.token}`)
      .send({});
    expect(response.status).toBe(403);
  });
});
