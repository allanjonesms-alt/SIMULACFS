import React, { useState, useMemo } from 'react';
import { ChevronLeft, Crown, User, Trash2, Clock, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SimulationLogsProps {
  allPageVisits: any[];
  allUsers: UserProfile[];
  allActiveSimulations: any[];
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: { title: string; message: string; onConfirm: () => void } | null) => void;
  onBack: () => void;
}

const SimulationLogsPage: React.FC<SimulationLogsProps> = ({ 
  allPageVisits, 
  allUsers, 
  allActiveSimulations, 
  setNotification,
  setConfirmModal,
  onBack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const simulationLogs = useMemo(() => {
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
      .filter(log => 
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.());
  }, [allPageVisits, allUsers, searchTerm]);

  const activeSimulationsList = useMemo(() => {
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
      .filter(sim => 
        sim.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sim.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.currentIndex - a.currentIndex);
  }, [allActiveSimulations, allUsers, searchTerm]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Voltar
      </button>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Logs de Simulado</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-sm w-full md:w-80"
          />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-4">Simulados Ativos ({activeSimulationsList.length})</h3>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12">
        {activeSimulationsList.map((sim, index) => (
          <div key={index} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3">
              {sim.isUpgraded ? (
                <Crown className="w-5 h-5 text-amber-500" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="font-bold text-slate-900">{sim.userName}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{sim.userEmail}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Início: {(() => {
                      const dateObj = sim.createdAt || sim.updatedAt;
                      if (!dateObj) return '--/--/---- --:--';
                      try {
                        if (dateObj.toDate) return dateObj.toDate().toLocaleString();
                        if (dateObj.seconds) return new Date(dateObj.seconds * 1000).toLocaleString();
                        return '--/--/---- --:--';
                      } catch (e) {
                        return '--/--/---- --:--';
                      }
                    })()}
                  </span>
                  <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    Questão: {sim.currentQuestion}
                  </div>
                </div>
              <button
                onClick={() => {
                  setConfirmModal({
                    title: "Excluir Simulado Ativo",
                    message: `Tem certeza que deseja excluir o simulado ativo de ${sim.userName}?`,
                    onConfirm: async () => {
                      try {
                        await deleteDoc(doc(db, 'active_simulations', sim.userId));
                        setNotification({ message: 'Simulado ativo excluído com sucesso!', type: 'success' });
                      } catch (error) {
                        console.error("Erro ao excluir simulado ativo:", error);
                        setNotification({ message: 'Erro ao excluir simulado ativo.', type: 'error' });
                      }
                    }
                  });
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                title="Excluir Simulado Ativo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {activeSimulationsList.length === 0 && <p className="p-6 text-slate-500">Nenhum simulado ativo no momento.</p>}
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-4">Histórico de Simulados Completos ({simulationLogs.length})</h3>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {simulationLogs.map((log, index) => (
          <div key={index} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <div>
              <p className="font-bold text-slate-900">{log.userName}</p>
              <p className="text-sm text-slate-500">{log.userEmail}</p>
            </div>
            <div className="text-sm text-slate-500">
              {log.createdAt?.toDate?.()?.toLocaleString()}
            </div>
          </div>
        ))}
        {simulationLogs.length === 0 && <p className="p-6 text-slate-500">Nenhum histórico encontrado.</p>}
      </div>
    </motion.div>
  );
};

export default SimulationLogsPage;
