import React from 'react';

export const LoadingSpinner = ({ text = 'Loading SocietyOS data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 rounded-full border-2 border-slate-700"></div>
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
      </div>
      {text && <p className="mt-4 text-xs font-medium text-slate-400 tracking-wide">{text}</p>}
    </div>
  );
};
