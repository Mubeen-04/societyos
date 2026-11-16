import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = useMemo(
    () => (permission) => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN' && ['MANAGE_MEETINGS', 'CREATE_PROPOSAL', 'VOTE_ON_PROPOSAL', 'APPROVE_PROPOSAL', 'MANAGE_COMMITTEE', 'VIEW_FINANCES', 'MANAGE_EXPENSES', 'APPROVE_EXPENSES', 'VIEW_FINANCIAL_REPORTS', 'PROCESS_PAYMENTS'].includes(permission)) return false;
      if (user.permissions && user.permissions.includes(permission)) return true;
      return false;
    },
    [user]
  );

  return { hasPermission, permissions: user?.permissions || [] };
};

export default usePermissions;
