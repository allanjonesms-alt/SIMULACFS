import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Lock } from 'lucide-react';

interface RankingPageProps {
  processedRanking: any[];
  profile: any;
  user: any;
  onUpgradeClick: () => void;
}

export const RankingPage: React.FC<RankingPageProps> = ({ processedRanking, profile, user, onUpgradeClick }) => {
  return (
    <motion.div key="ranking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Ranking Geral</h2>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-500">Ranking atualizado a cada 15 minutos.</p>
          {!profile?.isUpgraded && (
            <span className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-sm font-bold">
              <Lock className="w-4 h-4" />
              Acesso Limitado (Upgrade necessário)
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative">
        {!profile?.isUpgraded && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-sm">
              <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ranking Bloqueado</h3>
              <p className="text-slate-500 mb-6">Faça o upgrade para ver sua posição e comparar seu desempenho com outros sargentos.</p>
              <button 
                onClick={onUpgradeClick}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                Ver Planos
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-20">Posição</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Sargento (Anônimo)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Melhor Pontuação</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedRanking.map((r, idx) => (
              <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.userId === user.uid ? 'bg-indigo-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' : 
                    idx === 1 ? 'bg-slate-200 text-slate-700' : 
                    idx === 2 ? 'bg-orange-100 text-orange-700' : 
                    'text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900">
                  {r.anonymousName} {r.userId === user.uid && <span className="text-xs font-normal text-indigo-600 ml-2">(Você)</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="text-lg font-black text-indigo-600">
                    {r.score}
                    {r.diff !== 0 && (
                      <sup className={`text-xs ml-0.5 ${r.diff && r.diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {r.diff && r.diff > 0 ? `+${r.diff}` : r.diff}
                      </sup>
                    )}
                  </span>
                  <span className="text-slate-400 text-sm ml-1">/ {r.totalQuestions}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {r.date?.toDate ? r.date.toDate().toLocaleDateString() : 'Recent'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
