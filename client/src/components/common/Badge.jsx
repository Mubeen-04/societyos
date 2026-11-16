import React from 'react';

export const Badge = ({ status, variant, children }) => {
  const getVariantClass = (val) => {
    switch (val) {
      case 'OPEN':
      case 'PENDING':
      case 'WAITING':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'APPROVED':
      case 'RESOLVED':
      case 'CLOSED':
      case 'PAID':
      case 'INSIDE':
      case 'CONFIRMED':
      case 'ACTIVE':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'REJECTED':
      case 'CANCELLED':
      case 'OVERDUE':
      case 'EXPIRED':
      case 'EMERGENCY':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'HIGH':
      case 'URGENT':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border border-slate-600/40';
    }
  };

  const activeClass = variant ? getVariantClass(variant) : getVariantClass(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${activeClass}`}>
      {children || status}
    </span>
  );
};
