# 🏢 SocietyOS — Smart Residential Society Management Platform

> A production-quality, centralized SaaS platform engineered to digitize daily operations, security gating, visitor passes, maintenance billing, and amenity allocations for modern apartment complexes and residential housing societies.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-4.19-blue.svg)](https://expressjs.com/)
[![React Version](https://img.shields.io/badge/react-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/tailwindcss-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

---

## 🌟 Key Highlights & Real-World SaaS Engineering

SocietyOS goes beyond basic CRUD operations to demonstrate real-world full-stack architecture:

- **Strict Multi-Tenant Isolation**: Every database entity is scoped by `societyId` with automated middleware guards preventing cross-tenant access.
- **Digital Visitor Pass & Gate Control**: Pre-approve visitors with unique pass codes and QR codes, register walk-ins, and track check-ins and check-outs in real time.
- **Atomic Concurrency Protection**: Compound unique database indexes and slot reservation logic prevent double-booking of society amenities and duplicate voting on polls.
- **Authoritative Server-Side Billing**: Maintenance amounts are strictly computed from authoritative invoice records on the server—never trusted from frontend payloads.
- **Immutable Audit Timelines**: Sensitive actions (complaint status transitions, parking reassignments, invoice generations) are appended to tamper-proof activity logs.
- **Automated Background Jobs**: Built-in cron jobs detect overdue invoices, apply society late fees, sweep expired visitor passes, and auto-close completed polls.

---

## 👥 Supported Roles & Access Matrix

| Role | Key Capabilities |
| :--- | :--- |
| **Super Admin** | Cross-society administration and role assignment |
| **👑 Admin** | Society settings, wing & unit management, resident directory, batch monthly invoicing, complaints triage, audit logs |
| **🛡️ Security Guard** | Dedicated Gate Terminal, QR / Pass Code scanner, walk-in visitor dispatch, entry & exit logging, active visitors inside |
| **🏠 Resident** | Digital visitor pass creation, real-time walk-in approval, amenity slot booking, online mock maintenance payments, complaint tracking with ratings |
| **👥 Managing Committee** | High-level society health KPIs, financial collection percentages, SLA compliance, vendor ratings |
| **🔧 Service Vendor** | Workload terminal, service status progression (`IN_PROGRESS` → `RESOLVED`), repair notes |

---

## 🔑 Demo Login Accounts

Pre-seeded and ready for instant evaluation:

| Role | Email | Password | Assigned Unit |
| :--- | :--- | :--- | :--- |
| **Admin** | `mubeen.shaikh@societyos.com` | `Password123!` | Emerald A-101 |
| **Security Guard** | `ramesh.pawar@societyos.com` | `Password123!` | Gate Terminal #1 |
| **Resident** | `priya.sharma@societyos.com` | `Password123!` | Emerald A-102 |
| **Super Admin** | `superadmin@societyos.com` | `Password123!` | System |
| **Committee Member** | `aarav.mehta@societyos.com` | `Password123!` | Emerald A-201 |
| **Committee Member** | `dev.committee@societyos.com` | `Password123!` | Emerald A-401 |
| **Chairman** | `kavita.desai@societyos.com` | `Password123!` | Emerald A-202 |
| **Secretary** | `rohan.iyer@societyos.com` | `Password123!` | Emerald A-301 |
| **Treasurer** | `nisha.rao@societyos.com` | `Password123!` | Emerald A-302 |
| **Vendor (Plumber)** | `rajesh.plumber@societyos.com` | `Password123!` | Apex Plumbing |

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│               Frontend Layer (React 18 + Vite + Tailwind)              │
│  Resident Portal  │  Security Gate Terminal  │  Admin Command Center  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │  REST API (Axios HTTP)
┌────────────────────────────────────▼───────────────────────────────────┐
│                     Node.js / Express Backend Layer                    │
│   ├── JWT & RBAC Middleware + Tenant Isolation Guard                  │
│   ├── Modular Controllers (Complaints, Visitors, Billing, Amenities)   │
│   ├── Notification & Alert Dispatch Services                          │
│   └── Background Schedulers (node-cron for overdue fees & pass expiry)│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │  Mongoose ODM (Multi-Tenant Scoped)
┌────────────────────────────────────▼───────────────────────────────────┐
│                          Database Storage Layer                        │
│       MongoDB / Embedded MongoMemoryServer / MongoDB Atlas Cluster     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database & Schema Design

- **`Society`**: Multi-tenant root containing settings (currency, late fine %, quiet hours).
- **`Building` & `Apartment`**: 4 Wings (Emerald A, Sapphire B, Ruby C, Diamond D) housing 112 units.
- **`User`**: Role-based access with bcrypt password hashing, emergency contacts, and family members.
- **`Complaint`**: Ticket number (`CMP-2026-XXXX`), priority, category, attachments, and immutable timeline events.
- **`Visitor`**: Unique pass codes (`VP-XXXXXX`), QR data, entry timestamps, approval state machine.
- **`Amenity` & `AmenityBooking`**: Hourly slot duration, capacity tracking, and atomic collision checks.
- **`MaintenanceInvoice` & `Payment`**: Itemized charges, due dates, late fees, server-verified checkout, and unique receipts (`REC-YYYYMMDD-XXXX`).
- **`ParkingSlot`**: Resident allocations vs. live visitor parking grid.
- **`Announcement`, `Poll` & `Event`**: Community bulletins, polls enforcing 1 vote per unit, and events with RSVPs.
- **`AuditLog`**: Regulatory audit trail recording actor, action, previous state, new state, and IP.

---

## 🔌 API Endpoint Reference

### Authentication & Users
- `POST /api/auth/register` — Register society admin or resident
- `POST /api/auth/login` — Authenticate and return JWT token
- `GET  /api/auth/me` — Return current authenticated profile
- `GET  /api/societies/users` — Directory of society members (Admin/Super Admin)
- `PATCH /api/societies/users/:id/role` — Update user role

### Visitor Security
- `POST /api/visitors/pre-approve` — Resident pre-registers visitor pass
- `POST /api/visitors/walk-in` — Guard logs walk-in (triggers real-time resident approval)
- `PATCH /api/visitors/:id/decision` — Resident approves or declines walk-in entry
- `POST /api/visitors/verify-pass` — Verify QR or pass code at gate
- `POST /api/visitors/:id/check-in` — Guard logs entry time
- `POST /api/visitors/:id/check-out` — Guard logs exit time
- `GET  /api/visitors/active` — List visitors currently on premises

### Complaints & Services
- `GET  /api/complaints` — Filtered/paginated complaints list
- `POST /api/complaints` — Submit maintenance ticket
- `PATCH /api/complaints/:id/status` — Progress status with audit notes
- `POST /api/complaints/:id/feedback` — Resident confirmation and 1-5 star rating

### Amenities & Booking
- `GET  /api/amenities` — List society amenities
- `GET  /api/amenities/:id/slots?date=YYYY-MM-DD` — Real-time hourly slot availability
- `POST /api/amenities/book` — Atomic slot reservation (collision safe)
- `PATCH /api/amenities/bookings/:id/cancel` — Cancel booking

### Maintenance Billing
- `POST /api/billing/generate-monthly` — Admin batch monthly invoice generator
- `GET  /api/billing/invoices` — List invoices (scoped by resident or society)
- `POST /api/billing/pay` — Authoritative payment settlement & receipt creation

### Community & Analytics
- `GET  /api/community/announcements` — Society bulletins
- `GET  /api/community/polls` & `POST /api/community/polls/:id/vote` — Democratic poll voting
- `GET  /api/community/events` & `POST /api/community/events/:id/rsvp` — Social events RSVP
- `GET  /api/analytics/overview` — High-level KPI summary for Admin and governance roles
- `GET  /api/analytics/security-stats` — Gate terminal live counters
- `GET  /api/audit-logs` — Immutable administrative audit trail

---

## 🚀 Quickstart & Local Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [npm](https://www.npmjs.com/) v10+

### 1. Clone & Setup
```bash
cd society-os
```

### 2. Backend Setup
```bash
cd server
npm install
npm run seed     # Seeds 1 society, 4 wings, 112 units, demo accounts, complaints, and billing
npm run dev      # Starts server on http://localhost:5000
```
> *Note: If no `MONGO_URI` is provided, SocietyOS automatically initializes an embedded high-performance in-memory MongoDB instance for zero-config startup.*

### 3. Frontend Setup
In a new terminal:
```bash
cd client
npm install
npm run dev      # Starts frontend on http://localhost:5173
```

Navigate to `http://localhost:5173` and log in with any of the demo credentials!

---

## 🧪 Automated Testing

Run the automated integration test suite covering Authentication, RBAC, Multi-Tenant Isolation, Complaints state transitions, Gate Pass verification, Authoritative payments, and Single-vote poll constraints:

```bash
cd server
npm test
```

---

## 🔮 Future Enhancements
- Integration of real Razorpay / Stripe payment webhooks with PDF invoice downloads.
- Automatic Number Plate Recognition (ANPR) camera integration for automated barrier entry.
- Push notifications via WebPush / Firebase Cloud Messaging (FCM).
# societyos
