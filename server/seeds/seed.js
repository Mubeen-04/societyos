import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  Society,
  User,
  Building,
  Apartment,
  Complaint,
  Visitor,
  Amenity,
  AmenityBooking,
  MaintenanceInvoice,
  Payment,
  ParkingSlot,
  Announcement,
  Poll,
  PollVote,
  Event,
  Vendor,
  Notification,
  AuditLog,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeProposal,
  CommitteeVote,
  CommitteeDecision,
  CommitteeActionItem,
  Expense,
  ExpenseApproval,
  FinancialTransaction,
  FinanceCategory,
  StripeWebhookEvent,
  DailyHelp,
  DailyHelpLog
} from '../src/models/index.js';
import {
  ROLES,
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  VISITOR_PURPOSES,
  VISITOR_APPROVAL_STATUS,
  VISITOR_ENTRY_STATUS,
  INVOICE_STATUS,
  PAYMENT_METHODS
} from '../src/constants/index.js';

export const runSeed = async () => {
  console.log('🌱 Beginning SocietyOS Comprehensive Database Seeding...');
  await connectDB();

  // Clear existing collections
  await Promise.all([
    Society.deleteMany({}),
    User.deleteMany({}),
    Building.deleteMany({}),
    Apartment.deleteMany({}),
    Complaint.deleteMany({}),
    Visitor.deleteMany({}),
    Amenity.deleteMany({}),
    AmenityBooking.deleteMany({}),
    MaintenanceInvoice.deleteMany({}),
    Payment.deleteMany({}),
    ParkingSlot.deleteMany({}),
    Announcement.deleteMany({}),
    Poll.deleteMany({}),
    PollVote.deleteMany({}),
    Event.deleteMany({}),
    Vendor.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    CommitteeMember.deleteMany({}),
    CommitteeMeeting.deleteMany({}),
    CommitteeProposal.deleteMany({}),
    CommitteeVote.deleteMany({}),
    CommitteeDecision.deleteMany({}),
    CommitteeActionItem.deleteMany({}),
    Expense.deleteMany({}),
    ExpenseApproval.deleteMany({}),
    FinancialTransaction.deleteMany({}),
    FinanceCategory.deleteMany({}),
    StripeWebhookEvent.deleteMany({}),
    DailyHelp.deleteMany({}),
    DailyHelpLog.deleteMany({})
  ]);

  console.log('🧹 Purged existing collections.');

  // 1. Create Society
  const society = await Society.create({
    name: 'Green Valley Heights Residency',
    code: 'GVH-2026',
    address: {
      street: '42 Palm Boulevard, Sector 14',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400076',
      country: 'India'
    },
    contactEmail: 'admin@greenvalley.org',
    contactPhone: '+91 98201 23456',
    settings: {
      currency: 'INR',
      currencySymbol: '₹',
      lateFinePercentage: 5,
      proposalApprovalThreshold: 0.5,
      visitorApprovalRequired: true,
      quietHours: { start: '22:00', end: '06:00' }
    }
  });
  console.log(`✅ Society created: ${society.name} (${society.code})`);

  // 2. Create 2 Wings (A, B) — 14 floors each, 2 apartments per floor
  const wingsData = [
    { name: 'Emerald Wing A', code: 'A', floorsCount: 14, totalUnits: 28 },
    { name: 'Sapphire Wing B', code: 'B', floorsCount: 14, totalUnits: 28 }
  ];

  const buildings = await Building.insertMany(
    wingsData.map(w => ({ ...w, societyId: society._id }))
  );
  console.log(`✅ 2 Wings created: A, B (14 floors each, 2 apartments/floor)`);

  // 3. Create Apartments (2 units per floor × 14 floors × 2 wings = 56 units total)
  const apartmentDocs = [];
  const apartmentTypes = ['2BHK', '3BHK', '4BHK'];

  for (const b of buildings) {
    for (let floor = 1; floor <= b.floorsCount; floor++) {
      for (let unit = 1; unit <= 2; unit++) {
        const unitNumber = `${b.code}-${floor}0${unit}`;
        const type = apartmentTypes[(floor + unit) % apartmentTypes.length];
        const areaSqFt = type === '2BHK' ? 1100 : type === '3BHK' ? 1650 : 2200;

        apartmentDocs.push({
          societyId: society._id,
          buildingId: b._id,
          unitNumber,
          floorNumber: floor,
          type,
          areaSqFt,
          status: 'OCCUPIED'
        });
      }
    }
  }

  const apartments = await Apartment.insertMany(apartmentDocs);
  console.log(`✅ ${apartments.length} Residential Apartments created (2 per floor across 2 wings).`);

  // 4. Create Standard Key Role Users (Password: Password123!)
  const password = 'Password123!';

  await User.create({
    societyId: society._id,
    name: 'System Super Admin',
    email: 'superadmin@societyos.com',
    password,
    phone: '+91 98111 00000',
    role: ROLES.SUPER_ADMIN
  });

  // Admin
  const adminUser = await User.create({
    societyId: society._id,
    name: 'Mubeen Shaikh',
    email: 'mubeen.shaikh@societyos.com',
    password,
    phone: '+91 98111 00001',
    role: ROLES.ADMIN,
    apartmentId: apartments[0]._id,
    occupancyType: 'OWNER'
  });

  // Primary Resident (Unit A-102)
  const residentUser = await User.create({
    societyId: society._id,
    name: 'Priya Sharma',
    email: 'priya.sharma@societyos.com',
    password,
    phone: '+91 98111 00004',
    role: ROLES.RESIDENT,
    apartmentId: apartments[1]._id,
    occupancyType: 'OWNER',
    familyMembers: [
      { name: 'Rohit Sharma', relation: 'Spouse', phone: '+91 98111 00005' },
      { name: 'Ananya Sharma', relation: 'Daughter', phone: '' }
    ],
    emergencyContact: {
      name: 'Dr. K. Sharma',
      relation: 'Father',
      phone: '+91 98111 99999'
    }
  });

  // Committee Member (Unit A-201)
  const committeeUser = await User.create({
    societyId: society._id,
    name: 'Aarav Mehta',
    email: 'aarav.mehta@societyos.com',
    password,
    phone: '+91 98111 00002',
    role: ROLES.COMMITTEE_MEMBER,
    apartmentId: apartments[2]._id,
    occupancyType: 'OWNER'
  });

  // Governance roles (Units A-202, A-301, and A-302)
  const chairmanUser = await User.create({
    societyId: society._id,
    name: 'Kavita Desai',
    email: 'kavita.desai@societyos.com',
    password,
    phone: '+91 98111 00007',
    role: ROLES.CHAIRMAN,
    apartmentId: apartments[3]._id,
    occupancyType: 'OWNER'
  });

  const secretaryUser = await User.create({
    societyId: society._id,
    name: 'Rohan Iyer',
    email: 'rohan.iyer@societyos.com',
    password,
    phone: '+91 98111 00008',
    role: ROLES.SECRETARY,
    apartmentId: apartments[4]._id,
    occupancyType: 'OWNER'
  });

  const treasurerUser = await User.create({
    societyId: society._id,
    name: 'Nisha Rao',
    email: 'nisha.rao@societyos.com',
    password,
    phone: '+91 98111 00009',
    role: ROLES.TREASURER,
    apartmentId: apartments[5]._id,
    occupancyType: 'OWNER'
  });

  const committeeMemberUser = await User.create({
    societyId: society._id,
    name: 'Dev Patel',
    email: 'dev.committee@societyos.com',
    password,
    phone: '+91 98111 00010',
    role: ROLES.COMMITTEE_MEMBER,
    apartmentId: apartments[6]._id,
    occupancyType: 'OWNER'
  });

  // Security Guard
  const securityUser = await User.create({
    societyId: society._id,
    name: 'Ramesh Pawar',
    email: 'ramesh.pawar@societyos.com',
    password,
    phone: '+91 98111 00003',
    role: ROLES.SECURITY
  });

  // Vendor User
  const vendorUser = await User.create({
    societyId: society._id,
    name: 'Rajesh Plumber',
    email: 'rajesh.plumber@societyos.com',
    password,
    phone: '+91 98111 00006',
    role: ROLES.VENDOR
  });

  // Link primary role users to apartments
  await Apartment.findByIdAndUpdate(apartments[0]._id, { ownerId: adminUser._id, status: 'OCCUPIED' });
  await Apartment.findByIdAndUpdate(apartments[1]._id, { ownerId: residentUser._id, status: 'OCCUPIED' });
  await Apartment.findByIdAndUpdate(apartments[2]._id, { ownerId: committeeUser._id, status: 'OCCUPIED' });
  await Apartment.findByIdAndUpdate(apartments[3]._id, { ownerId: chairmanUser._id, status: 'OCCUPIED' });
  await Apartment.findByIdAndUpdate(apartments[4]._id, { ownerId: secretaryUser._id, status: 'OCCUPIED' });
  await Apartment.findByIdAndUpdate(apartments[5]._id, { ownerId: treasurerUser._id, status: 'OCCUPIED' });
  await Apartment.findByIdAndUpdate(apartments[6]._id, { ownerId: committeeMemberUser._id, status: 'OCCUPIED' });

  const termStart = new Date();
  termStart.setFullYear(termStart.getFullYear() - 1);
  const termEnd = new Date(termStart);
  termEnd.setFullYear(termEnd.getFullYear() + 3);
  const governanceUsers = [chairmanUser, secretaryUser, treasurerUser, committeeUser, committeeMemberUser];
  await CommitteeMember.insertMany(governanceUsers.map((user) => ({
    societyId: society._id,
    userId: user._id,
    designation: user.role,
    termStart,
    termEnd,
    status: 'ACTIVE'
  })));

  // Create one resident account per remaining apartment using first_name.last_name email convention
  const residentNamePool = [
    'Vikram Malhotra', 'Sneha Patel', 'Arjun Kapoor', 'Deepika Reddy', 'Karan Johar', 'Neha Gupta',
    'Amitabh Verma', 'Sunita Rao', 'Rajat Nair', 'Ananya Iyer', 'Mohit Sen', 'Pooja Khanna',
    'Nikhil Desai', 'Meera Joshi', 'Siddharth Shah', 'Divya Kapoor', 'Harsh Chawla', 'Ritika Saini',
    'Aditya Roy', 'Naina Bhatia', 'Kunal Mehra', 'Tanvi Bansal', 'Manav Kulkarni', 'Hina Singh',
    'Saurabh Gupta', 'Ishita Banerjee', 'Rohit Narang', 'Mitali Kaul', 'Yash Tandon', 'Sara Khan',
    'Pranay Dubey', 'Aisha Malik', 'Tejas Patil', 'Aditi Sawant', 'Nitin Shah', 'Bhavya Gupta',
    'Omkar Joshi', 'Pallavi Rathi', 'Vivek Arora', 'Apeksha Jain', 'Rishabh Nanda', 'Kavya Pillai',
    'Ashok Sharma', 'Seema Menon', 'Dev Patel', 'Nisha Khurana', 'Varun Sharma', 'Madhuri Nair',
    'Shivam Rao', 'Snehal Vora', 'Gaurav Malhotra', 'Anuja Goyal', 'Milan Dutta', 'Priyanka Nair',
    'Ramesh Sethi', 'Anjali Banerji', 'Karthik Iyer', 'Monica Walia', 'Sanjay Shetty', 'Farah Qureshi',
    'Abhishek Bose', 'Rhea Fernandes', 'Nikhil Agarwal', 'Shalini Jha', 'Danish Khan'
  ];

  const reservedApartmentIds = new Set([
    apartments[0]._id.toString(),
    apartments[1]._id.toString(),
    apartments[2]._id.toString(),
    apartments[3]._id.toString(),
    apartments[4]._id.toString(),
    apartments[5]._id.toString(),
    apartments[6]._id.toString()
  ]);

  let residentIndex = 0;

  for (let i = 0; i < apartments.length; i++) {
    const apartment = apartments[i];
    if (reservedApartmentIds.has(apartment._id.toString())) continue;

    const residentName = residentNamePool[residentIndex] || `Resident ${residentIndex + 1}`;
    const [firstName, ...lastNameParts] = residentName.split(' ');
    const lastName = lastNameParts.join(' ');
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@societyos.com`;

    const additionalResident = await User.create({
      societyId: society._id,
      name: residentName,
      email,
      password,
      phone: `+91 98222 ${String(1000 + residentIndex).padStart(4, '0')}`,
      role: ROLES.RESIDENT,
      apartmentId: apartment._id,
      occupancyType: residentIndex % 2 === 0 ? 'OWNER' : 'TENANT'
    });

    await Apartment.findByIdAndUpdate(apartment._id, {
      [additionalResident.occupancyType === 'TENANT' ? 'tenantId' : 'ownerId']: additionalResident._id,
      status: 'OCCUPIED'
    });

    residentIndex += 1;
  }

  console.log(`✅ Seeded demo accounts with first_name.last_name emails and one user per apartment.`);

  const addDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };
  const committeeParticipants = governanceUsers.map((user) => user._id);
  const meetings = await CommitteeMeeting.insertMany([
    {
      societyId: society._id, title: 'Monthly Governance Review',
      description: 'Review society operations, pending proposals, and committee follow-through.',
      date: addDays(5), startTime: '18:30', endTime: '20:00', location: 'Society Clubhouse',
      agenda: ['Maintenance budget review', 'CCTV installation proposal', 'Security and visitor process'],
      participants: committeeParticipants, status: 'SCHEDULED', createdBy: secretaryUser._id, attachments: []
    },
    {
      societyId: society._id, title: 'September Committee Meeting',
      description: 'Review completed works and agree on the CCTV infrastructure proposal.',
      date: addDays(-12), startTime: '19:00', endTime: '20:15', location: 'Society Clubhouse',
      agenda: ['Security camera coverage', 'Lift maintenance schedule'],
      participants: committeeParticipants, status: 'COMPLETED', createdBy: secretaryUser._id,
      minutes: { summary: 'The committee reviewed security coverage and the maintenance schedule.', discussionPoints: ['Current camera blind spots', 'Annual lift inspection dates'], decisions: ['Proceed with the CCTV proposal for a committee vote.'], notes: 'Vendor quotations will be reviewed before procurement.', recordedBy: secretaryUser._id, recordedAt: addDays(-11) },
      attachments: []
    },
    {
      societyId: society._id, title: 'Annual Budget Planning',
      description: 'Prepare recommendations for the coming society financial year.',
      date: addDays(24), startTime: '10:00', endTime: '12:00', location: 'Management Office',
      agenda: ['Annual maintenance plan', 'Reserve allocation', 'Vendor renewals'],
      participants: committeeParticipants, status: 'SCHEDULED', createdBy: secretaryUser._id, attachments: []
    }
  ]);

  const proposals = await CommitteeProposal.create([
    {
      societyId: society._id, title: 'Install CCTV Cameras in Basement and Perimeter',
      description: 'Approve procurement and installation of cameras to improve coverage at identified security blind spots.',
      category: 'SECURITY', createdBy: secretaryUser._id, attachments: [], votingStart: addDays(-1), votingEnd: addDays(8), status: 'OPEN_FOR_VOTING'
    },
    {
      societyId: society._id, title: 'Upgrade Clubhouse Water Filtration',
      description: 'Replace the existing filtration unit and add a quarterly maintenance schedule.',
      category: 'MAINTENANCE', createdBy: secretaryUser._id, attachments: [], status: 'DRAFT'
    },
    {
      societyId: society._id, title: 'Approve Lift Safety Inspection Contract',
      description: 'Renew the independent annual inspection contract for both residential wings.',
      category: 'INFRASTRUCTURE', createdBy: chairmanUser._id, attachments: [], votingStart: addDays(-24), votingEnd: addDays(-18), status: 'APPROVED',
      result: { yes: 4, no: 1, abstain: 0, total: 5, outcome: 'APPROVED', approvalThreshold: society.settings.proposalApprovalThreshold, calculatedAt: addDays(-18) }
    }
  ]);

  const openProposalVotes = [
    { user: chairmanUser, vote: 'YES' }, { user: secretaryUser, vote: 'YES' }, { user: treasurerUser, vote: 'YES' },
    { user: committeeUser, vote: 'NO' }, { user: committeeMemberUser, vote: 'ABSTAIN' }
  ];
  const closedProposalVotes = [
    { user: chairmanUser, vote: 'YES' }, { user: secretaryUser, vote: 'YES' }, { user: treasurerUser, vote: 'YES' },
    { user: committeeUser, vote: 'YES' }, { user: committeeMemberUser, vote: 'NO' }
  ];
  await CommitteeVote.insertMany([
    ...openProposalVotes.map(({ user, vote }) => ({ societyId: society._id, proposalId: proposals[0]._id, userId: user._id, vote })),
    ...closedProposalVotes.map(({ user, vote }) => ({ societyId: society._id, proposalId: proposals[2]._id, userId: user._id, vote, createdAt: addDays(-19) }))
  ]);

  const decisions = await CommitteeDecision.insertMany([
    { societyId: society._id, title: 'Arrange independent lift safety inspection', description: 'Coordinate access with the lift vendor and share the inspection certificate with residents.', meetingId: meetings[1]._id, proposalId: proposals[2]._id, responsiblePersonId: adminUser._id, deadline: addDays(4), status: 'IN_PROGRESS', createdBy: chairmanUser._id },
    { societyId: society._id, title: 'Collect final CCTV vendor quotations', description: 'Collect comparable pricing and warranty terms for the next committee review.', meetingId: meetings[0]._id, proposalId: proposals[0]._id, responsiblePersonId: adminUser._id, deadline: addDays(7), status: 'PENDING', createdBy: chairmanUser._id },
    { societyId: society._id, title: 'Publish annual lift inspection summary', description: 'Share the approved inspection summary in the resident community board.', meetingId: meetings[1]._id, responsiblePersonId: secretaryUser._id, deadline: addDays(-2), status: 'COMPLETED', createdBy: secretaryUser._id }
  ]);

  const actionItems = await CommitteeActionItem.insertMany([
    { societyId: society._id, title: 'Request two CCTV vendor quotations', description: 'Include camera coverage map, warranty, and installation schedule.', assignedTo: adminUser._id, createdBy: secretaryUser._id, meetingId: meetings[0]._id, decisionId: decisions[1]._id, deadline: addDays(3), priority: 'HIGH', status: 'IN_PROGRESS' },
    { societyId: society._id, title: 'Confirm lift inspection date', description: 'Coordinate with the vendor and notify residents of the inspection window.', assignedTo: adminUser._id, createdBy: chairmanUser._id, meetingId: meetings[1]._id, decisionId: decisions[0]._id, deadline: addDays(2), priority: 'MEDIUM', status: 'PENDING' },
    { societyId: society._id, title: 'Prepare meeting minutes for review', description: 'Share the draft minutes with committee participants.', assignedTo: secretaryUser._id, createdBy: secretaryUser._id, meetingId: meetings[0]._id, deadline: addDays(1), priority: 'MEDIUM', status: 'PENDING' },
    { societyId: society._id, title: 'Verify annual lift inspection summary publication', description: 'Confirm the inspection report is available in resident notices.', assignedTo: secretaryUser._id, createdBy: chairmanUser._id, meetingId: meetings[1]._id, decisionId: decisions[2]._id, deadline: addDays(-1), priority: 'LOW', status: 'COMPLETED' }
  ]);

  await AuditLog.insertMany([
    { societyId: society._id, userId: secretaryUser._id, userName: secretaryUser.name, userRole: secretaryUser.role, action: 'MEETING_CREATED', entity: 'CommitteeMeeting', entityId: meetings[0]._id.toString(), newState: { title: meetings[0].title }, ipAddress: 'seed' },
    { societyId: society._id, userId: secretaryUser._id, userName: secretaryUser.name, userRole: secretaryUser.role, action: 'PROPOSAL_PUBLISHED', entity: 'CommitteeProposal', entityId: proposals[0]._id.toString(), newState: { title: proposals[0].title }, ipAddress: 'seed' },
    { societyId: society._id, userId: chairmanUser._id, userName: chairmanUser.name, userRole: chairmanUser.role, action: 'DECISION_CREATED', entity: 'CommitteeDecision', entityId: decisions[0]._id.toString(), newState: { title: decisions[0].title }, ipAddress: 'seed' },
    { societyId: society._id, userId: adminUser._id, userName: adminUser.name, userRole: adminUser.role, action: 'ACTION_ITEM_CREATED', entity: 'CommitteeActionItem', entityId: actionItems[0]._id.toString(), newState: { title: actionItems[0].title }, ipAddress: 'seed' }
  ]);
  await Notification.insertMany(governanceUsers.map((user) => ({
    societyId: society._id, recipientId: user._id, type: 'GOVERNANCE_UPDATE',
    title: 'CCTV proposal is open for voting', message: 'Review the security camera proposal and cast one committee vote.',
    link: `/committee/proposals/${proposals[0]._id}`, metadata: { proposalId: proposals[0]._id }
  })));

  // 5. Create Vendors
  const vendorServiceDocs = [
    {
      companyName: 'Apex Plumbing Solutions',
      category: 'Plumbing',
      contactPerson: 'Rajesh Plumber',
      phone: '+91 98333 11111',
      email: 'rajesh.plumber@societyos.com',
      rating: 4.8,
      jobsCompleted: 64,
      openJobs: 2
    },
    {
      companyName: 'Spark Electrical AMC',
      category: 'Electrical',
      contactPerson: 'Vikas Sharma',
      phone: '+91 98333 22222',
      email: 'electrical@apex.com',
      rating: 4.6,
      jobsCompleted: 48,
      openJobs: 1
    },
    {
      companyName: 'Schindler Lift Technicians',
      category: 'Lift',
      contactPerson: 'Kunal Joshi',
      phone: '+91 98333 33333',
      email: 'service@liftcorp.com',
      rating: 4.9,
      jobsCompleted: 112,
      openJobs: 0
    },
    {
      companyName: 'CleanPro Facility Management',
      category: 'Cleaning',
      contactPerson: 'Sunita Das',
      phone: '+91 98333 44444',
      email: 'info@cleanpro.com',
      rating: 4.5,
      jobsCompleted: 88,
      openJobs: 3
    }
  ];

  const vendors = await Vendor.insertMany(
    vendorServiceDocs.map(v => ({ ...v, societyId: society._id }))
  );
  console.log(`✅ ${vendors.length} Vendors registered.`);

  // 6. Create Amenities
  const amenityDocs = [
    {
      name: 'Grand Clubhouse & Banquet Hall',
      category: 'CLUBHOUSE',
      description: 'Air-conditioned multipurpose banquet hall with audio visual setup and indoor lounge seating.',
      capacityPerSlot: 1,
      slotDurationMinutes: 120,
      openingTime: '09:00',
      closingTime: '23:00',
      pricingType: 'PAID',
      hourlyRate: 1500,
      rules: ['No loud music after 10 PM', 'Advance deposit required for decoration', 'Catering waste must be cleared'],
      imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Olympic Infinity Swimming Pool',
      category: 'SWIMMING_POOL',
      description: 'Temperature-controlled outdoor infinity swimming pool with dedicated toddler splash area.',
      capacityPerSlot: 15,
      slotDurationMinutes: 60,
      openingTime: '06:00',
      closingTime: '21:00',
      pricingType: 'FREE',
      hourlyRate: 0,
      rules: ['Proper nylon swimming costume mandatory', 'Shower prior to entry', 'Children under 10 require adult supervision'],
      imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Championship Tennis Court',
      category: 'TENNIS_COURT',
      description: 'Floodlit synthetic hard court compliant with ITF tournament standards.',
      capacityPerSlot: 4,
      slotDurationMinutes: 60,
      openingTime: '06:00',
      closingTime: '22:00',
      pricingType: 'FREE',
      hourlyRate: 0,
      rules: ['Non-marking sports shoes only', 'Max 1 hour reservation per day', 'Bring your own racquets and balls'],
      imageUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Harmony Wellness & Spa',
      // Use existing allowed category 'CLUBHOUSE' for wellness/spa facility
      category: 'CLUBHOUSE',
      description: 'Integrated wellness studio offering sauna, steam, therapeutic massages, guided yoga sessions and recovery lounges — focused on resident wellbeing and relaxation.',
      capacityPerSlot: 25,
      slotDurationMinutes: 60,
      openingTime: '07:00',
      closingTime: '21:00',
      pricingType: 'PAID',
      hourlyRate: 500,
      rules: ['Pre-booking required for spa treatments', 'Bring a towel for sauna', 'Respect quiet recovery zones', 'Children under 12 require adult supervision'],
      imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const amenities = await Amenity.insertMany(
    amenityDocs.map(a => ({ ...a, societyId: society._id }))
  );
  console.log(`✅ ${amenities.length} Amenities seeded.`);

  // 7. Seed Sample Bookings
  const todayStr = new Date().toISOString().split('T')[0];
  await AmenityBooking.create({
    societyId: society._id,
    amenityId: amenities[0]._id,
    userId: residentUser._id,
    apartmentId: residentUser.apartmentId,
    bookingDate: todayStr,
    startTime: '18:00',
    endTime: '20:00',
    attendeesCount: 25,
    status: 'CONFIRMED',
    totalCharge: 3000
  });

  // 8. Create Complaints with Real-World Timelines
  const complaintsSeed = [
    {
      ticketNumber: 'CMP-2026-0001',
      title: 'Water pipe leakage under kitchen sink',
      description: 'Continuous dripping from the main cold water inlet under the modular counter, pooling on the floor.',
      category: COMPLAINT_CATEGORIES.PLUMBING,
      priority: COMPLAINT_PRIORITIES.HIGH,
      status: COMPLAINT_STATUSES.IN_PROGRESS,
      apartmentId: residentUser.apartmentId,
      createdBy: residentUser._id,
      assignedVendorId: vendors[0]._id,
      assignedAt: new Date(Date.now() - 4 * 3600 * 1000),
      timeline: [
        {
          status: COMPLAINT_STATUSES.OPEN,
          action: 'Complaint Registered',
          actorId: residentUser._id,
          actorName: residentUser.name,
          notes: 'Dripping issue reported by resident',
          timestamp: new Date(Date.now() - 6 * 3600 * 1000)
        },
        {
          status: COMPLAINT_STATUSES.ASSIGNED,
          action: 'Assigned to Apex Plumbing Solutions',
          actorId: adminUser._id,
          actorName: adminUser.name,
          notes: 'Plumbing contractor dispatched for on-site inspection',
          timestamp: new Date(Date.now() - 4 * 3600 * 1000)
        },
        {
          status: COMPLAINT_STATUSES.IN_PROGRESS,
          action: 'Technician on Premises',
          actorId: vendorUser._id,
          actorName: vendors[0].contactPerson,
          notes: 'Replaced rubber washer gasket, testing pressure valve',
          timestamp: new Date(Date.now() - 1 * 3600 * 1000)
        }
      ]
    },
    {
      ticketNumber: 'CMP-2026-0002',
      title: 'Elevator #2 in Wing A making grinding vibration',
      description: 'Loud mechanical screech between 3rd and 4th floors when elevator is ascending.',
      category: COMPLAINT_CATEGORIES.LIFT,
      priority: COMPLAINT_PRIORITIES.EMERGENCY,
      status: COMPLAINT_STATUSES.OPEN,
      apartmentId: apartments[1]._id,
      createdBy: committeeUser._id,
      timeline: [
        {
          status: COMPLAINT_STATUSES.OPEN,
          action: 'Elevator Breakdown Alert',
          actorId: committeeUser._id,
          actorName: committeeUser.name,
          notes: 'Urgent attention required before evening traffic peak',
          timestamp: new Date(Date.now() - 2 * 3600 * 1000)
        }
      ]
    },
    {
      ticketNumber: 'CMP-2026-0003',
      title: 'Flickering corridor light outside A-102',
      description: 'Corridor LED fitting turns on and off erratically after 7 PM.',
      category: COMPLAINT_CATEGORIES.ELECTRICAL,
      priority: COMPLAINT_PRIORITIES.LOW,
      status: COMPLAINT_STATUSES.RESOLVED,
      apartmentId: apartments[1]._id,
      createdBy: committeeUser._id,
      assignedVendorId: vendors[1]._id,
      resolvedAt: new Date(Date.now() - 24 * 3600 * 1000),
      timeline: [
        {
          status: COMPLAINT_STATUSES.OPEN,
          action: 'Complaint Registered',
          actorId: committeeUser._id,
          actorName: committeeUser.name,
          notes: 'Reported',
          timestamp: new Date(Date.now() - 48 * 3600 * 1000)
        },
        {
          status: COMPLAINT_STATUSES.RESOLVED,
          action: 'Driver Replacement Completed',
          actorId: adminUser._id,
          actorName: adminUser.name,
          notes: 'Replaced 18W Philips LED driver unit. Tested OK.',
          timestamp: new Date(Date.now() - 24 * 3600 * 1000)
        }
      ]
    }
  ];

  await Complaint.insertMany(complaintsSeed.map(c => ({ ...c, societyId: society._id })));
  console.log(`✅ Sample Complaints seeded with immutable audit timelines.`);

  // 9. Seed Visitors
  const visitorsSeed = [
    {
      passCode: 'VP-A94E21',
      qrCodeData: JSON.stringify({ passCode: 'VP-A94E21', societyId: society._id }),
      visitorName: 'Rahul Sharma (Guest)',
      visitorPhone: '+91 98444 11111',
      purpose: VISITOR_PURPOSES.GUEST,
      residentId: residentUser._id,
      apartmentId: residentUser.apartmentId,
      vehicleNumber: 'MH-02-CD-4921',
      visitorCount: 2,
      passType: 'PRE_APPROVED',
      approvalStatus: VISITOR_APPROVAL_STATUS.APPROVED,
      entryStatus: VISITOR_ENTRY_STATUS.WAITING,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 24 * 3600 * 1000),
      approvedBy: residentUser._id
    },
    {
      passCode: 'VP-F3B089',
      qrCodeData: JSON.stringify({ passCode: 'VP-F3B089', societyId: society._id }),
      visitorName: 'Amazon Prime Express Delivery',
      visitorPhone: '+91 98444 22222',
      purpose: VISITOR_PURPOSES.DELIVERY,
      residentId: residentUser._id,
      apartmentId: residentUser.apartmentId,
      vehicleNumber: 'MH-03-EK-1029',
      visitorCount: 1,
      passType: 'WALK_IN',
      approvalStatus: VISITOR_APPROVAL_STATUS.APPROVED,
      entryStatus: VISITOR_ENTRY_STATUS.INSIDE,
      validFrom: new Date(Date.now() - 30 * 60 * 1000),
      validUntil: new Date(Date.now() + 3 * 3600 * 1000),
      actualEntryTime: new Date(Date.now() - 25 * 60 * 1000),
      guardInId: securityUser._id,
      approvedBy: residentUser._id
    },
    {
      passCode: 'VP-88D14C',
      qrCodeData: JSON.stringify({ passCode: 'VP-88D14C', societyId: society._id }),
      visitorName: 'Swiggy Food Courier',
      visitorPhone: '+91 98444 33333',
      purpose: VISITOR_PURPOSES.DELIVERY,
      residentId: residentUser._id,
      apartmentId: residentUser.apartmentId,
      vehicleNumber: 'MH-01-AB-7711',
      visitorCount: 1,
      passType: 'WALK_IN',
      approvalStatus: VISITOR_APPROVAL_STATUS.PENDING,
      entryStatus: VISITOR_ENTRY_STATUS.WAITING,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 2 * 3600 * 1000),
      guardInId: securityUser._id
    }
  ];

  await Visitor.insertMany(visitorsSeed.map(v => ({ ...v, societyId: society._id })));
  console.log(`✅ Sample Visitors (Active Inside, Pre-approved, Walk-in Pending) seeded.`);

  // 10. Seed Parking Slots (112 Resident Slots + 12 Visitor Slots)
  const parkingDocs = [];
  // Resident slots
  for (let i = 1; i <= 24; i++) {
    const slotNumber = `P-${String(i).padStart(2, '0')}`;
    const isAssigned = i === 3;
    parkingDocs.push({
      societyId: society._id,
      slotNumber,
      type: 'RESIDENT',
      floorLevel: 'Basement 1',
      status: isAssigned ? 'OCCUPIED' : 'AVAILABLE',
      assignedApartmentId: isAssigned ? residentUser.apartmentId : null,
      assignedResidentId: isAssigned ? residentUser._id : null,
      vehicleType: isAssigned ? 'FOUR_WHEELER' : null,
      vehicleNumber: isAssigned ? 'MH-02-CB-8899' : ''
    });
  }

  // Visitor slots
  for (let v = 1; v <= 8; v++) {
    const slotNumber = `V-${String(v).padStart(2, '0')}`;
    parkingDocs.push({
      societyId: society._id,
      slotNumber,
      type: 'VISITOR',
      floorLevel: 'Ground Courtyard',
      status: v === 1 ? 'OCCUPIED' : 'AVAILABLE'
    });
  }

  await ParkingSlot.insertMany(parkingDocs);
  console.log(`✅ ${parkingDocs.length} Parking slots (Resident & Visitor) configured.`);

  // 10b. Seed Daily Help & Domestic Staff
  const anitaEntryTime = new Date(Date.now() - 45 * 60 * 1000);
  const anitaStaff = await DailyHelp.create({
    societyId: society._id,
    name: 'Anita Shinde',
    phone: '+91 98201 11223',
    category: 'MAID',
    passCode: 'DH-1001',
    status: 'ACTIVE',
    isInside: true,
    lastEntryTime: anitaEntryTime,
    rating: 5.0,
    reviewCount: 2,
    assignedUnits: [
      { apartmentId: apartments[1]._id, residentId: residentUser._id, assignedAt: addDays(-60) },
      { apartmentId: apartments[2]._id, residentId: committeeUser._id, assignedAt: addDays(-45) }
    ],
    reviews: [
      {
        residentId: residentUser._id,
        apartmentId: apartments[1]._id,
        rating: 5,
        comment: 'Extremely punctual, thorough with deep cleaning, and very trustworthy. Highly recommended!',
        createdAt: addDays(-10)
      },
      {
        residentId: committeeUser._id,
        apartmentId: apartments[2]._id,
        rating: 5,
        comment: 'Working with our household for months, reliable and honest.',
        createdAt: addDays(-5)
      }
    ],
    idProof: { idType: 'AADHAAR', idNumber: 'XXXX-XXXX-4912' },
    emergencyContact: { name: 'Santosh Shinde', phone: '+91 98201 99881' }
  });

  const anitaLog = await DailyHelpLog.create({
    societyId: society._id,
    staffId: anitaStaff._id,
    entryTime: anitaEntryTime,
    guardInId: securityUser._id,
    gateNumber: 'Gate 1'
  });
  anitaStaff.currentLogId = anitaLog._id;
  await anitaStaff.save();

  const rameshStaff = await DailyHelp.create({
    societyId: society._id,
    name: 'Ramesh Chaurasia',
    phone: '+91 98202 33445',
    category: 'COOK',
    passCode: 'DH-1002',
    status: 'ACTIVE',
    isInside: false,
    lastEntryTime: new Date(Date.now() - 5 * 3600 * 1000),
    lastExitTime: new Date(Date.now() - 2 * 3600 * 1000),
    rating: 4.8,
    reviewCount: 1,
    assignedUnits: [
      { apartmentId: apartments[1]._id, residentId: residentUser._id, assignedAt: addDays(-30) },
      { apartmentId: apartments[4]._id, residentId: secretaryUser._id, assignedAt: addDays(-20) }
    ],
    reviews: [
      {
        residentId: residentUser._id,
        apartmentId: apartments[1]._id,
        rating: 5,
        comment: 'Great multi-cuisine cook! Very hygienic and prepares delicious South Indian and North Indian meals.',
        createdAt: addDays(-7)
      }
    ],
    idProof: { idType: 'AADHAAR', idNumber: 'XXXX-XXXX-7104' },
    emergencyContact: { name: 'Malti Chaurasia', phone: '+91 98202 88771' }
  });

  const sureshEntryTime = new Date(Date.now() - 20 * 60 * 1000);
  const sureshStaff = await DailyHelp.create({
    societyId: society._id,
    name: 'Suresh Yadav',
    phone: '+91 98203 55667',
    category: 'DRIVER',
    passCode: 'DH-1003',
    status: 'ACTIVE',
    isInside: true,
    lastEntryTime: sureshEntryTime,
    vehicleNumber: 'MH-02-CD-5544',
    rating: 4.9,
    reviewCount: 1,
    assignedUnits: [
      { apartmentId: apartments[3]._id, residentId: chairmanUser._id, assignedAt: addDays(-40) }
    ],
    reviews: [
      {
        residentId: chairmanUser._id,
        apartmentId: apartments[3]._id,
        rating: 5,
        comment: 'Very disciplined, safe driver, punctual, and maintains the vehicle spotless.',
        createdAt: addDays(-12)
      }
    ],
    idProof: { idType: 'DRIVING_LICENSE', idNumber: 'MH-022019003819' }
  });

  const sureshLog = await DailyHelpLog.create({
    societyId: society._id,
    staffId: sureshStaff._id,
    entryTime: sureshEntryTime,
    guardInId: securityUser._id,
    gateNumber: 'Gate 2'
  });
  sureshStaff.currentLogId = sureshLog._id;
  await sureshStaff.save();

  await DailyHelp.create({
    societyId: society._id,
    name: 'Sunita Devi',
    phone: '+91 98204 77889',
    category: 'CLEANER',
    passCode: 'DH-1004',
    status: 'ACTIVE',
    isInside: false,
    rating: 4.7,
    reviewCount: 1,
    assignedUnits: [
      { apartmentId: apartments[6]._id, residentId: committeeMemberUser._id, assignedAt: addDays(-15) }
    ],
    reviews: [
      {
        residentId: committeeMemberUser._id,
        apartmentId: apartments[6]._id,
        rating: 5,
        comment: 'Very hardworking, does dusting and bathroom cleaning very efficiently.',
        createdAt: addDays(-3)
      }
    ]
  });

  const karanUser = await User.findOne({ email: 'karan.johar@societyos.com' });
  await DailyHelp.create({
    societyId: society._id,
    name: 'Geeta Bai',
    phone: '+91 98205 99001',
    category: 'BABYSITTER',
    passCode: 'DH-1005',
    status: 'ACTIVE',
    isInside: false,
    rating: 5.0,
    reviewCount: 1,
    assignedUnits: karanUser ? [
      { apartmentId: karanUser.apartmentId, residentId: karanUser._id, assignedAt: addDays(-25) }
    ] : [],
    reviews: karanUser ? [
      {
        residentId: karanUser._id,
        apartmentId: karanUser.apartmentId,
        rating: 5,
        comment: 'Wonderful nanny, exceptionally caring and gentle with kids.',
        createdAt: addDays(-2)
      }
    ] : []
  });

  console.log(`✅ Daily Help & Domestic Staff directory seeded with reviews & inside logs.`);

  // 11. Seed Maintenance Invoices & Payments
  const now = new Date();
  const formatYearMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = formatYearMonth(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = formatYearMonth(lastMonthDate);

  const currentMonthCode = currentMonth.replace('-', '');
  const lastMonthCode = lastMonth.replace('-', '');
  const lastMonthPaidDate = addDays(-20);
  const lastMonthDueDate = addDays(-15);
  const lastPaidDateCode = `${lastMonthPaidDate.getFullYear()}${String(lastMonthPaidDate.getMonth() + 1).padStart(2, '0')}${String(lastMonthPaidDate.getDate()).padStart(2, '0')}`;

  // Current month invoice (Pending for resident)
  const invCurrent = await MaintenanceInvoice.create({
    societyId: society._id,
    invoiceNumber: `INV-${currentMonthCode}-A102`,
    apartmentId: residentUser.apartmentId,
    residentId: residentUser._id,
    billingMonth: currentMonth,
    dueDate: addDays(7),
    items: [
      { title: 'Base Maintenance & Facilities', amount: 4000, type: 'MAINTENANCE' },
      { title: 'Municipal & Borewell Water Charges', amount: 300, type: 'WATER' },
      { title: 'Dedicated Covered Parking Levy', amount: 500, type: 'PARKING' }
    ],
    totalAmount: 4800,
    lateFee: 0,
    payableAmount: 4800,
    status: INVOICE_STATUS.PENDING
  });

  // Last month invoice (Paid with Payment and Receipt)
  const invPaid = await MaintenanceInvoice.create({
    societyId: society._id,
    invoiceNumber: `INV-${lastMonthCode}-A102`,
    apartmentId: residentUser.apartmentId,
    residentId: residentUser._id,
    billingMonth: lastMonth,
    dueDate: lastMonthDueDate,
    items: [
      { title: 'Base Maintenance & Facilities', amount: 4000, type: 'MAINTENANCE' },
      { title: 'Municipal & Borewell Water Charges', amount: 300, type: 'WATER' },
      { title: 'Dedicated Covered Parking Levy', amount: 500, type: 'PARKING' }
    ],
    totalAmount: 4800,
    lateFee: 0,
    payableAmount: 4800,
    status: INVOICE_STATUS.PAID,
    paidAt: lastMonthPaidDate
  });

  const paymentRecord = await Payment.create({
    societyId: society._id,
    paymentId: `PAY-TXN-${lastPaidDateCode}-8831`,
    invoiceId: invPaid._id,
    userId: residentUser._id,
    apartmentId: residentUser.apartmentId,
    amount: 4800,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    provider: 'BANK',
    transactionRef: 'TXN-HDFC-9912039',
    status: 'SUCCESS',
    receiptNumber: `REC-${lastPaidDateCode}-0012`,
    paidAt: lastMonthPaidDate
  });

  invPaid.paymentId = paymentRecord._id;
  invPaid.amountPaid = 4800;
  await invPaid.save();
  await FinancialTransaction.create({ societyId: society._id, direction: 'CREDIT', amount: 4800, category: 'MAINTENANCE', description: `Maintenance collection for ${lastMonth}`, reference: paymentRecord.transactionRef, referenceType: 'MAINTENANCE_PAYMENT', invoiceId: invPaid._id, paymentId: paymentRecord._id, createdBy: adminUser._id, idempotencyKey: `SEED:PAYMENT:${paymentRecord._id}` });

  // Create sample invoices for other units to populate admin collection metrics
  for (let u = 3; u < 15; u++) {
    const apartment = await Apartment.findOne({ _id: apartments[u]._id, societyId: society._id }).populate('tenantId ownerId');
    const actualResident = apartment?.tenantId || apartment?.ownerId;
    if (!actualResident || actualResident.societyId.toString() !== society._id.toString()) {
      throw new Error(`Cannot seed maintenance invoice for ${apartments[u].unitNumber}: no society resident is linked as owner or tenant.`);
    }

    const seededStatuses = [INVOICE_STATUS.PENDING, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE];
    const status = seededStatuses[(u - 3) % seededStatuses.length];
    const baseMaintenance = 4000 + (u % 5) * 250;
    const waterCharges = 300;
    const parkingCharges = 500;
    const totalAmount = baseMaintenance + waterCharges + parkingCharges;
    const amountPaid = status === INVOICE_STATUS.PAID
      ? totalAmount
      : status === INVOICE_STATUS.PARTIALLY_PAID
        ? Math.round(totalAmount * 0.4)
        : 0;

    let dueDate;
    if (status === INVOICE_STATUS.OVERDUE) {
      dueDate = addDays(-7);
    } else if (status === INVOICE_STATUS.PENDING) {
      dueDate = addDays(7);
    } else if (status === INVOICE_STATUS.PARTIALLY_PAID) {
      dueDate = addDays(5);
    } else {
      dueDate = addDays(7);
    }

    await MaintenanceInvoice.create({
      societyId: society._id,
      invoiceNumber: `INV-${currentMonthCode}-${apartment.unitNumber.replace('-', '')}`,
      apartmentId: apartment._id,
      residentId: actualResident._id,
      billingMonth: currentMonth,
      dueDate,
      items: [
        { title: 'Base Maintenance & Facilities', amount: baseMaintenance, type: 'MAINTENANCE' },
        { title: 'Water Charges', amount: waterCharges, type: 'WATER' },
        { title: 'Parking', amount: parkingCharges, type: 'PARKING' }
      ],
      totalAmount,
      lateFee: 0,
      payableAmount: totalAmount,
      amountPaid,
      status,
      paidAt: status === INVOICE_STATUS.PAID ? addDays(-2) : null
    });
  }

  console.log(`✅ Maintenance Invoices and Payment records seeded.`);

  const financeCategories = ['Security', 'Lift Maintenance', 'Cleaning', 'Electricity', 'Gardening', 'Repairs'];
  await FinanceCategory.insertMany(financeCategories.map((name) => ({ societyId: society._id, name, type: 'EXPENSE', isActive: true })));
  const seededExpenses = await Expense.insertMany([
    { societyId: society._id, title: 'Lift annual maintenance', description: 'Quarterly preventive maintenance and safety certification.', category: 'Lift Maintenance', amount: 45000, vendorName: 'Apex Elevator Services', invoiceNumber: 'APX-2026-091', createdBy: adminUser._id, status: 'UNDER_REVIEW', submittedAt: new Date() },
    { societyId: society._id, title: 'September security services', description: 'Monthly guard services and relief staffing.', category: 'Security', amount: 30000, vendorName: 'Sentinel Facility Services', invoiceNumber: 'SFS-20918', createdBy: adminUser._id, status: 'SUBMITTED', submittedAt: new Date() },
    { societyId: society._id, title: 'Cleaning supplies replenishment', description: 'Consumables for common areas.', category: 'Cleaning', amount: 8300, vendorName: 'Cleanwell Supplies', createdBy: adminUser._id, status: 'DRAFT' },
    { societyId: society._id, title: 'Garden drainage repair', description: 'Work declined pending corrected quotation.', category: 'Gardening', amount: 52000, vendorName: 'GreenScape Works', createdBy: adminUser._id, status: 'REJECTED', submittedAt: new Date(), rejectionReason: 'Please provide a revised, itemized quotation.' },
    { societyId: society._id, title: 'Water pump control panel', description: 'Replacement panel approved for payment.', category: 'Repairs', amount: 18000, vendorName: 'Prime Pump Systems', createdBy: adminUser._id, status: 'PAYMENT_PENDING', submittedAt: new Date(), approvedAt: new Date() },
    { societyId: society._id, title: 'Common area electricity bill', description: 'Monthly common area power bill.', category: 'Electricity', amount: 12750, vendorName: 'MSEDCL', invoiceNumber: 'MSEDCL-SEP26', createdBy: adminUser._id, status: 'PAID', submittedAt: new Date(), approvedAt: new Date(), paidAt: new Date() }
  ]);
  const expenseByTitle = Object.fromEntries(seededExpenses.map((expense) => [expense.title, expense]));
  await ExpenseApproval.insertMany([
    { societyId: society._id, expenseId: expenseByTitle['Lift annual maintenance']._id, requiredRole: 'TREASURER', status: 'APPROVED', decidedBy: treasurerUser._id, decidedAt: new Date() },
    { societyId: society._id, expenseId: expenseByTitle['Lift annual maintenance']._id, requiredRole: 'CHAIRMAN', status: 'PENDING' },
    { societyId: society._id, expenseId: expenseByTitle['September security services']._id, requiredRole: 'TREASURER', status: 'PENDING' },
    { societyId: society._id, expenseId: expenseByTitle['Water pump control panel']._id, requiredRole: 'TREASURER', status: 'APPROVED', decidedBy: treasurerUser._id, decidedAt: new Date() },
    { societyId: society._id, expenseId: expenseByTitle['Water pump control panel']._id, requiredRole: 'CHAIRMAN', status: 'APPROVED', decidedBy: chairmanUser._id, decidedAt: new Date() },
    { societyId: society._id, expenseId: expenseByTitle['Common area electricity bill']._id, requiredRole: 'TREASURER', status: 'APPROVED', decidedBy: treasurerUser._id, decidedAt: new Date() },
    { societyId: society._id, expenseId: expenseByTitle['Common area electricity bill']._id, requiredRole: 'CHAIRMAN', status: 'APPROVED', decidedBy: chairmanUser._id, decidedAt: new Date() }
  ]);
  const seededExpensePayment = await Payment.create({ societyId: society._id, paymentId: 'PAY-SEED-EXPENSE-01', expenseId: expenseByTitle['Common area electricity bill']._id, amount: 12750, paymentMethod: PAYMENT_METHODS.BANK_TRANSFER, provider: 'BANK', transactionRef: 'TXN-MSEDCL-SEP26', status: 'SUCCESS', paidAt: new Date(), recordedBy: adminUser._id, receiptNumber: 'REC-SEED-EXPENSE-01' });
  await Expense.updateOne({ _id: expenseByTitle['Common area electricity bill']._id }, { $set: { paymentId: seededExpensePayment._id } });
  await FinancialTransaction.create({ societyId: society._id, direction: 'DEBIT', amount: 12750, category: 'Electricity', description: 'Common area electricity bill', reference: seededExpensePayment.transactionRef, referenceType: 'EXPENSE_PAYMENT', expenseId: expenseByTitle['Common area electricity bill']._id, paymentId: seededExpensePayment._id, createdBy: adminUser._id, idempotencyKey: `SEED:PAYMENT:${seededExpensePayment._id}` });

  // 12. Seed Announcements, Polls, and Events
  await Announcement.create({
    societyId: society._id,
    title: 'Municipal Water Supply Pipeline Maintenance',
    content: 'Please note that municipal water supply will remain suspended between 10:00 AM and 02:00 PM on Sunday due to pipeline valve upgrades. Overhead emergency tanks will remain online.',
    category: 'WATER',
    priority: 'HIGH',
    pinned: true,
    authorId: adminUser._id,
    authorName: adminUser.name
  });

  await Announcement.create({
    societyId: society._id,
    title: 'EV Fast-Charging Stations Operational in Basement 1',
    content: 'Four 22kW AC Type-2 electric vehicle charging stations have been commissioned in Basement 1 near Pillar B-12. Residents may initiate charging via the SocietyOS app.',
    category: 'GENERAL',
    priority: 'NORMAL',
    pinned: false,
    authorId: committeeUser._id,
    authorName: committeeUser.name
  });

  const poll = await Poll.create({
    societyId: society._id,
    question: 'Should the society install 4K AI CCTV surveillance cameras in the perimeter and basement parking?',
    description: 'Estimated investment of ₹2.4 Lakhs to be funded from the society reserve fund with zero additional resident levy.',
    options: [
      { text: 'Yes, proceed with installation', votesCount: 14 },
      { text: 'No, current camera coverage is sufficient', votesCount: 2 },
      { text: 'Need additional vendor quotation options', votesCount: 3 }
    ],
    expiresAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
    createdById: adminUser._id,
    status: 'ACTIVE',
    totalVotes: 19
  });

  await PollVote.create({
    societyId: society._id,
    pollId: poll._id,
    userId: residentUser._id,
    apartmentId: residentUser.apartmentId,
    selectedOptionIndex: 0
  });

  await Event.create({
    societyId: society._id,
    title: 'Grand Ganesh Chaturthi Mahotsav 2026',
    description: 'Join us for evening Aarti, cultural dance performances by society children, and traditional Mahaprasad dinner at the Community Lawn.',
    location: 'Central Clubhouse Amphitheater',
    eventDate: new Date('2026-09-12'),
    startTime: '18:30',
    endTime: '22:00',
    organizer: 'Society Cultural Committee',
    rsvps: [
      {
        userId: residentUser._id,
        apartmentId: residentUser.apartmentId,
        userName: residentUser.name,
        guestsCount: 3,
        response: 'GOING'
      }
    ]
  });

  console.log(`✅ Announcements, Society Polls, and Events seeded.`);

  // 13. Seed Initial Notifications
  await Notification.create({
    societyId: society._id,
    recipientId: residentUser._id,
    type: 'PAYMENT_DUE',
    title: `${currentMonth} Maintenance Bill`,
    message: `Your monthly maintenance bill of ₹4,800 is due by ${invCurrent.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    link: '/bills'
  });

  console.log(`\n======================================================`);
  console.log(`🎉 SocietyOS Seeding Finished Successfully!`);
  console.log(`======================================================`);
  console.log(`Demo Credentials:`);
  console.log(`🛡️  Super Admin: superadmin@societyos.com       / Password123!`);
  console.log(`👑 Admin:     mubeen.shaikh@societyos.com     / Password123!`);
  console.log(`🛡️  Security:  ramesh.pawar@societyos.com     / Password123!`);
  console.log(`🏠 Resident:  priya.sharma@societyos.com     / Password123!`);
  console.log(`👥 Committee Member: aarav.mehta@societyos.com     / Password123!`);
  console.log(`👑 Chairman:    kavita.desai@societyos.com         / Password123!`);
  console.log(`📝 Secretary:   rohan.iyer@societyos.com           / Password123!`);
  console.log(`💰 Treasurer:   nisha.rao@societyos.com             / Password123!`);
  console.log(`🔧 Vendor:    rajesh.plumber@societyos.com   / Password123!`);
  console.log(`======================================================\n`);

  console.log('Committee Member: dev.committee@societyos.com / Password123!');
  return society;
};

// If run directly via node seeds/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seeding error:', err);
      await disconnectDB();
      process.exit(1);
    });
}
