import React from 'react';

interface BadgeProps {
  status: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

export const Badge: React.FC<BadgeProps> = ({ status, color }) => {
  let colorClasses = 'bg-gray-100 text-gray-800';

  // Auto-detect color if not provided based on common status keywords
  if (!color) {
    const lower = status.toLowerCase();
    if (lower.includes('complete') || lower.includes('active') || lower.includes('approved')) color = 'green';
    else if (lower.includes('pending') || lower.includes('progress') || lower.includes('warning')) color = 'yellow';
    else if (lower.includes('cancel') || lower.includes('error') || lower.includes('reject')) color = 'red';
    else if (lower.includes('info') || lower.includes('new')) color = 'blue';
  }

  switch (color) {
    case 'green': colorClasses = 'bg-emerald-100 text-emerald-800 border border-emerald-200'; break;
    case 'blue': colorClasses = 'bg-blue-100 text-blue-800 border border-blue-200'; break;
    case 'yellow': colorClasses = 'bg-amber-100 text-amber-800 border border-amber-200'; break;
    case 'red': colorClasses = 'bg-rose-100 text-rose-800 border border-rose-200'; break;
    default: colorClasses = 'bg-slate-100 text-slate-800 border border-slate-200'; break;
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
      {status}
    </span>
  );
};
