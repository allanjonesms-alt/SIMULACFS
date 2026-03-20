import React from 'react';
import { motion } from 'motion/react';

interface HistoryPageProps {
  history: any[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ history }) => {
  return (
    <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Meu Histórico</h2>
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Acertos</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Aproveitamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    h.isMiniSimulado ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {h.isMiniSimulado ? 'Mini' : 'Simulado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {h.date?.toDate ? h.date.toDate().toLocaleString() : 'Recent'}
                </td>
                <td className="px-6 py-4 font-bold text-emerald-600">{h.score}</td>
                <td className="px-6 py-4 text-slate-600">{h.totalQuestions}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (h.score / h.totalQuestions) >= 0.7 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {((h.score / h.totalQuestions) * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
