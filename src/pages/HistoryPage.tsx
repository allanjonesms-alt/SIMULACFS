import React from 'react';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface HistoryPageProps {
  history: any[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ history }) => {
  const generatePDF = (simulation: any) => {
    const doc = new jsPDF();
    doc.text('Detalhes do Simulado', 14, 15);
    doc.text(`Data: ${simulation.date?.toDate ? simulation.date.toDate().toLocaleString() : 'Recent'}`, 14, 22);
    doc.text(`Pontuação: ${simulation.score} / ${simulation.totalQuestions}`, 14, 29);

    const tableColumn = ['Questão', 'Resposta', 'Correta', 'Justificativa'];
    const tableRows: any[] = [];

    simulation.questions?.forEach((q: any, index: number) => {
      const userAnswer = simulation.answers ? simulation.answers[index] : -1;
      const correctOption = q.correctOption;
      
      const userAnswerText = userAnswer !== -1 ? q.options[userAnswer] : 'Não respondida';
      const correctOptionText = q.options[correctOption];
      
      const rowData = [
        q.text.substring(0, 50) + '...',
        userAnswerText,
        correctOptionText,
        q.justification || 'Sem justificativa'
      ];
      tableRows.push(rowData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
    });

    doc.save(`simulado_${simulation.id}.pdf`);
  };

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
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Aproveitamento</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</th>
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
                <td className="px-6 py-4 font-bold text-emerald-600">{h.score} / {h.totalQuestions}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (h.score / h.totalQuestions) >= 0.7 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {((h.score / h.totalQuestions) * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  {h.questions ? (
                    <button 
                      onClick={() => generatePDF(h)}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs">Sem detalhes</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
