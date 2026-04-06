import React from 'react';
import { Users } from 'lucide-react';

interface CompetitionCardProps {
  onClick: () => void;
}

const CompetitionCard: React.FC<CompetitionCardProps> = ({ onClick }) => {
  const totalCandidates = 960;
  const totalVacancies = 46;
  const ratio = (totalCandidates / totalVacancies).toFixed(2);

  return (
    <button 
      onClick={onClick}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow text-left w-full h-full"
    >
      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
        <Users className="w-7 h-7 text-amber-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Concorrência</p>
        <p className="text-lg font-black text-slate-900 truncate">{ratio} por vaga</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
          {totalCandidates} Cabos / {totalVacancies} Vagas
        </p>
        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-2">Clique para ver a lista</p>
      </div>
    </button>
  );
};

export default CompetitionCard;
