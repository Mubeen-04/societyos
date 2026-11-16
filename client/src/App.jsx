import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ResidentDashboard } from './pages/resident/ResidentDashboard';
import { MyComplaints } from './pages/resident/MyComplaints';
import { MyVisitors } from './pages/resident/MyVisitors';
import { AmenityBooking } from './pages/resident/AmenityBooking';
import { MaintenanceBills } from './pages/resident/MaintenanceBills';
import { MyParking } from './pages/resident/MyParking';
import { DailyHelpPage } from './pages/resident/DailyHelpPage';
import { SecurityTerminal } from './pages/security/SecurityTerminal';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UnitDirectory } from './pages/admin/UnitDirectory';
import { UserDirectory } from './pages/admin/UserDirectory';
import { BillingCenter } from './pages/admin/BillingCenter';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { CommitteeOverview } from './pages/committee/CommitteeOverview';
import { CommitteeMembersPage } from './pages/committee/CommitteeMembersPage';
import { CommitteeMeetingsPage, CommitteeMeetingDetailPage } from './pages/committee/CommitteeMeetingsPage';
import { CommitteeProposalsPage, CommitteeProposalDetailPage } from './pages/committee/CommitteeProposalsPage';
import { CommitteeActionItemsPage, CommitteeDecisionsPage } from './pages/committee/CommitteeWorkItemsPage';
import { CommitteeFinancialsPage } from './pages/committee/CommitteeFinancialsPage';
import { FinanceOverview, FinanceCollections, FinanceExpenses, FinanceTransactions, FinanceReports, PaymentStatusPage, PaymentReceiptPage, PaymentCancelledPage } from './pages/finance/FinancePages';
import { VendorWorkload } from './pages/vendor/VendorWorkload';
import { CommunityBoard } from './pages/community/CommunityBoard';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { usePermissions } from './hooks/usePermissions';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Authenticating SocietyOS session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user role is not authorized for this specific route, redirect to their home
    if (user.role === 'SECURITY') return <Navigate to="/security/terminal" replace />;
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (['CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'].includes(user.role)) {
      return <Navigate to="/committee/dashboard" replace />;
    }
    if (user.role === 'VENDOR') return <Navigate to="/vendor/workload" replace />;
    return <Navigate to="/resident/dashboard" replace />;
  }

  return children;
};

const PermissionRoute = ({ children, permission }) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission) ? children : <Navigate to="/" replace />;
};

// Root index redirector based on authenticated role
const RoleIndexRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Routing to home dashboard..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'SECURITY') return <Navigate to="/security/terminal" replace />;
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (['CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'].includes(user?.role)) {
    return <Navigate to="/committee/dashboard" replace />;
  }
  if (user?.role === 'VENDOR') return <Navigate to="/vendor/workload" replace />;
  return <Navigate to="/resident/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleIndexRedirect />} />

              {/* Resident Routes */}
              <Route path="resident/dashboard" element={<ProtectedRoute allowedRoles={['RESIDENT', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><ResidentDashboard /></ProtectedRoute>} />
              <Route path="resident/daily-help" element={<ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN', 'SUPER_ADMIN', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><DailyHelpPage /></ProtectedRoute>} />
              <Route path="resident/complaints" element={<ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN', 'SUPER_ADMIN', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER', 'VENDOR']}><MyComplaints /></ProtectedRoute>} />
              <Route path="resident/visitors" element={<ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN', 'SUPER_ADMIN', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><MyVisitors /></ProtectedRoute>} />
              <Route path="resident/amenities" element={<ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN', 'SUPER_ADMIN', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><AmenityBooking /></ProtectedRoute>} />
              <Route path="resident/bills" element={<ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><MaintenanceBills /></ProtectedRoute>} />
              <Route path="resident/parking" element={<ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN', 'SUPER_ADMIN', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><MyParking /></ProtectedRoute>} />

              {/* Security Terminal */}
              <Route
                path="security/terminal"
                element={
                  <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN', 'SUPER_ADMIN']}>
                    <SecurityTerminal />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/units"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                    <UnitDirectory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                    <UserDirectory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/billing"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                    <BillingCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Committee and governance pages are visible only to roles with VIEW_ANALYTICS. */}
              <Route path="committee/dashboard" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeOverview /></PermissionRoute>} />
              <Route path="committee/members" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeMembersPage /></PermissionRoute>} />
              <Route path="committee/meetings" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeMeetingsPage /></PermissionRoute>} />
              <Route path="committee/meetings/:id" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeMeetingDetailPage /></PermissionRoute>} />
              <Route path="committee/proposals" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeProposalsPage /></PermissionRoute>} />
              <Route path="committee/proposals/:id" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeProposalDetailPage /></PermissionRoute>} />
              <Route path="committee/decisions" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeDecisionsPage /></PermissionRoute>} />
              <Route path="committee/action-items" element={<PermissionRoute permission="VIEW_ANALYTICS"><CommitteeActionItemsPage /></PermissionRoute>} />
              <Route path="committee/financials" element={<PermissionRoute permission="VIEW_FINANCES"><CommitteeFinancialsPage /></PermissionRoute>} />

              {/* Society finance and resident payment confirmation routes. */}
              <Route path="finance" element={<PermissionRoute permission="VIEW_FINANCES"><FinanceOverview /></PermissionRoute>} />
              <Route path="finance/collections" element={<PermissionRoute permission="VIEW_FINANCES"><FinanceCollections /></PermissionRoute>} />
              <Route path="finance/expenses" element={<PermissionRoute permission="VIEW_FINANCES"><FinanceExpenses /></PermissionRoute>} />
              <Route path="finance/transactions" element={<PermissionRoute permission="VIEW_FINANCES"><FinanceTransactions /></PermissionRoute>} />
              <Route path="finance/reports" element={<PermissionRoute permission="VIEW_FINANCIAL_REPORTS"><FinanceReports /></PermissionRoute>} />
              <Route path="payment/success" element={<ProtectedRoute allowedRoles={['RESIDENT', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><PaymentStatusPage /></ProtectedRoute>} />
              <Route path="payment/receipt/:paymentId" element={<ProtectedRoute allowedRoles={['RESIDENT', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><PaymentReceiptPage /></ProtectedRoute>} />
              <Route path="payment/cancelled" element={<ProtectedRoute allowedRoles={['RESIDENT', 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER']}><PaymentCancelledPage /></ProtectedRoute>} />

              {/* Vendor Routes */}
              <Route
                path="vendor/workload"
                element={
                  <ProtectedRoute allowedRoles={['VENDOR', 'ADMIN', 'SUPER_ADMIN']}>
                    <VendorWorkload />
                  </ProtectedRoute>
                }
              />

              {/* Shared Community Board */}
              <Route path="community" element={<CommunityBoard />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
    </AuthProvider>
  );
}
