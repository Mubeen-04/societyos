import React from 'react';
import { FolderOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'There are no active records in this view right now.',
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-700/80 bg-slate-800/30">
      <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl mb-4 text-teal-400 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 btn-primary text-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
