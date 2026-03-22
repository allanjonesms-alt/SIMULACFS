import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { UserProfile, SimulationResult } from '../types';

interface InactiveUsersProps {
  allUsers: UserProfile[];
  allSimulations: SimulationResult[];
  onBack: () => void;
}

const InactiveUsersPage: React.FC<InactiveUsersProps> = ({ allUsers, allSimulations, onBack }) => {
  const usersWithFullSimulations = new Set(
    allSimulations
      .filter(s => !s.isMiniSimulado)
      .map(s => s.userId)
  );

  const inactiveUsers = allUsers.filter(u => !usersWithFullSimulations.has(u.uid) && !u.isUpgraded);

  return (
    <motion.div key="admin_inactive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Voltar para Usuários
      </button>
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Usuários Gratuitos sem Simulado</h2>
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <p className="text-slate-600 mb-4 font-bold">Total: {inactiveUsers.length} usuários</p>
        <div className="space-y-2">
          {inactiveUsers.map(u => (
            <div key={u.uid} className="p-3 bg-slate-50 rounded-xl text-sm font-mono text-slate-700 border border-slate-100">
              {u.email}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default InactiveUsersPage;
