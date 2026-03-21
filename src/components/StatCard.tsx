import React from 'react';

function StatCard({ label, value, icon, subValue, subLabel }: { 
  label: string, 
  value: string | number, 
  icon: React.ReactNode,
  subValue?: string | number,
  subLabel?: string
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
        <div className="w-7 h-7">
          {icon}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{label}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-black text-slate-900">{value}</p>
          {subValue && (
            <p className="text-sm font-bold text-slate-400">
              / {subValue}
            </p>
          )}
        </div>
        {subLabel && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{subLabel}</p>
        )}
      </div>
    </div>
  );
}

export default StatCard;
