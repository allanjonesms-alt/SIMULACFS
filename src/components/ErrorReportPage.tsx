import React from 'react';
import { motion } from 'motion/react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, sendNotification } from '../firebase';

interface ErrorReportPageProps {
  allErrors: any[];
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: any) => void;
}

export const ErrorReportPage: React.FC<ErrorReportPageProps> = ({ allErrors, setNotification, setConfirmModal }) => {
  return (
    <motion.div key="admin_errors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Erros Relatados</h2>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-sm font-bold text-slate-500">Total: {allErrors.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {allErrors.length > 0 ? (
          allErrors.map((err) => (
            <div key={err.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      err.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {err.status === 'pending' ? 'Pendente' : 'Resolvido'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {err.createdAt?.toDate ? err.createdAt.toDate().toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Relatado por: {err.userEmail}</h4>
                  <p className="text-xs text-slate-400 font-mono">ID Questão: {err.questionId}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'question_errors', err.id), {
                          status: err.status === 'pending' ? 'resolved' : 'pending',
                          updatedAt: serverTimestamp()
                        });
                        if (err.status === 'pending') {
                          await sendNotification(
                            err.userId,
                            'Erro Corrigido',
                            `O erro que você relatou na questão "${err.questionText}" foi corrigido. Obrigado pela sua contribuição!`,
                            'success'
                          );
                        }
                      } catch (e) {
                        setNotification({ message: 'Erro ao atualizar status', type: 'error' });
                      }
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      err.status === 'pending' 
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' 
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'
                    }`}
                  >
                    {err.status === 'pending' ? 'Marcar como Resolvido' : 'Marcar como Pendente'}
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        title: "Excluir Relatório",
                        message: "Deseja excluir este relatório de erro permanentemente?",
                        onConfirm: async () => {
                          try {
                            await deleteDoc(doc(db, 'question_errors', err.id));
                            setNotification({ message: 'Relatório excluído', type: 'success' });
                          } catch (e) {
                            setNotification({ message: 'Erro ao excluir', type: 'error' });
                          }
                        }
                      });
                    }}
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Enunciado da Questão</p>
                  <p className="text-slate-700 text-sm italic" translate="no">"{err.questionText}"</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Descrição do Erro</p>
                  <p className="text-indigo-900 text-sm font-medium" translate="no">{err.description}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
            Nenhum erro relatado até o momento.
          </div>
        )}
      </div>
    </motion.div>
  );
};
