import React from 'react';
import { ChevronLeft, Crown, User } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface SimulationLogsProps {
  allPageVisits: any[];
  allUsers: UserProfile[];
  allActiveSimulations: any[];
  onBack: () => void;
}

const SimulationLogsPage: React.FC<SimulationLogsProps> = ({ allPageVisits, allUsers, allActiveSimulations, onBack }) => {
  const simulationLogs = React.useMemo(() => {
    return allPageVisits
      .filter(v => v.pageName === 'simulado')
      .map(v => {
        const user = allUsers.find(u => u.uid === v.userId);
        return {
          ...v,
          userName: user?.displayName || 'Desconhecido',
          userEmail: user?.email || 'Sem email',
        };
      })
      .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.());
  }, [allPageVisits, allUsers]);

  const activeSimulationsList = React.useMemo(() => {
    return allActiveSimulations
      .map(a => {
        const user = allUsers.find(u => u.uid === a.userId);
        return {
          ...a,
          userName: user?.displayName || 'Desconhecido',
          userEmail: user?.email || 'Sem email',
          isUpgraded: user?.isUpgraded || false,
          currentQuestion: a.currentIndex + 1
        };
      })
      .sort((a, b) => b.currentIndex - a.currentIndex);
  }, [allActiveSimulations, allUsers]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Voltar
      </button>
      
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Simulados Ativos</h2>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12">
        {activeSimulationsList.map((sim, index) => (
          <div key={index} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-3">
              {sim.isUpgraded ? (
                <Crown className="w-5 h-5 text-amber-500" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="font-bold text-slate-900">{sim.userName}</p>
                <p className="text-sm text-slate-500">{sim.userEmail}</p>
              </div>
            </div>
            <div className="text-sm font-bold text-indigo-600">
              Questão: {sim.currentQuestion}
            </div>
          </div>
        ))}
        {activeSimulationsList.length === 0 && <p className="p-6 text-slate-500">Nenhum simulado ativo no momento.</p>}
      </div>

      <h2 className="text-3xl font-bold text-slate-900 mb-8">Histórico de Simulados Completos</h2>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {simulationLogs.map((log, index) => (
          <div key={index} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0">
            <div>
              <p className="font-bold text-slate-900">{log.userName}</p>
              <p className="text-sm text-slate-500">{log.userEmail}</p>
            </div>
            <div className="text-sm text-slate-500">
              {log.createdAt?.toDate?.()?.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SimulationLogsPage;
