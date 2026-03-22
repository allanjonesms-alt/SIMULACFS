import React from 'react';
import { Calendar } from 'lucide-react';

const phases = [
  { name: 'Inscrição', start: new Date('2026-03-16'), end: new Date('2026-03-31') },
  { name: 'Resultado Preliminar Inscrições', start: new Date('2026-04-02'), end: new Date('2026-04-02') },
  { name: 'Recurso Inscrições', start: new Date('2026-04-02'), end: new Date('2026-04-06') },
  { name: 'Resultado Definitivo Inscrições', start: new Date('2026-04-10'), end: new Date('2026-04-10') },
  { name: 'Convocação Prova', start: new Date('2026-04-10'), end: new Date('2026-04-10') },
  { name: 'Prova Escrita', start: new Date('2026-05-17'), end: new Date('2026-05-17') },
  { name: 'Gabarito Preliminar', start: new Date('2026-05-19'), end: new Date('2026-05-19') },
  { name: 'Recurso Gabarito', start: new Date('2026-05-19'), end: new Date('2026-05-20') },
  { name: 'Gabarito Definitivo', start: new Date('2026-05-27'), end: new Date('2026-05-27') },
  { name: 'Resultado Prova', start: new Date('2026-05-27'), end: new Date('2026-05-27') },
];

function ScheduleCard() {
  const today = new Date();
  
  let currentPhaseIndex = -1;
  for (let i = 0; i < phases.length; i++) {
    if (today >= phases[i].start && today <= phases[i].end) {
      currentPhaseIndex = i;
      break;
    }
  }

  // If today is before the first phase
  if (currentPhaseIndex === -1 && today < phases[0].start) {
    currentPhaseIndex = -1; // Not started yet
  }
  
  // If today is after the last phase
  if (currentPhaseIndex === -1 && today > phases[phases.length - 1].end) {
    currentPhaseIndex = phases.length - 1; // Finished
  }

  const currentPhase = currentPhaseIndex === -1 ? { name: 'Aguardando Início' } : phases[currentPhaseIndex];
  const nextPhase = currentPhaseIndex < phases.length - 1 ? phases[currentPhaseIndex + 1] : { name: 'Finalizado' };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
        <Calendar className="w-7 h-7 text-indigo-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Fase Atual</p>
        <p className="text-lg font-black text-slate-900 truncate">{currentPhase.name}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
          {currentPhaseIndex !== -1 && 'start' in currentPhase && 'end' in currentPhase
            ? `${currentPhase.start.toLocaleDateString('pt-BR')} ${currentPhase.start.getTime() !== currentPhase.end.getTime() ? `a ${currentPhase.end.toLocaleDateString('pt-BR')}` : ''}`
            : ''}
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 line-clamp-3">Próxima: <span className="text-slate-600">{nextPhase.name}</span></p>
      </div>
    </div>
  );
}

export default ScheduleCard;
