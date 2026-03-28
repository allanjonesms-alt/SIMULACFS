import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, AlertTriangle, X, CheckCircle2, Database } from 'lucide-react';
import { collection, doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { AnimatePresence } from 'motion/react';
import { db, OperationType, handleFirestoreError, sendNotification } from '../firebase';

interface ErrorReportPageProps {
  allErrors: any[];
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: any) => void;
}

export const ErrorReportPage: React.FC<ErrorReportPageProps> = ({ allErrors, setNotification, setConfirmModal }) => {
  const [resolvingError, setResolvingError] = React.useState<any>(null);
  const [solutionText, setSolutionText] = React.useState('');
  const [systemErrors, setSystemErrors] = useState<any[]>([]);

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    try {
      const q = query(collection(db, 'system_errors'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const eList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSystemErrors(eList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_errors');
    }
  };

  const handleResolve = async () => {
    if (!resolvingError || !solutionText.trim()) return;

    try {
      await updateDoc(doc(db, 'question_errors', resolvingError.id), {
        status: 'resolved',
        solution: solutionText,
        updatedAt: serverTimestamp()
      });

      await sendNotification(
        resolvingError.userId,
        'Erro Corrigido',
        `O erro que você relatou na questão "${resolvingError.questionText}" foi corrigido. Solução: ${solutionText}`,
        'success'
      );

      setNotification({ message: 'Erro marcado como resolvido', type: 'success' });
      setResolvingError(null);
      setSolutionText('');
    } catch (e) {
      setNotification({ message: 'Erro ao atualizar status', type: 'error' });
    }
  };

  return (
    <motion.div key="admin_errors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Erros Relatados</h2>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-sm font-bold text-slate-500">Questões: {allErrors.length}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-sm font-bold text-slate-500">Sistema: {systemErrors.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <h3 className="text-xl font-bold text-slate-700 mt-4">Erros de Sistema (Salvamento de Simulado)</h3>
        {systemErrors.length > 0 ? (
          systemErrors.map((err) => (
            <div key={err.id} className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-red-900">Erro de Sistema: {err.operationType}</h4>
                  <p className="text-xs text-red-600 font-mono">Usuário: {err.userEmail || err.userId}</p>
                  <p className="text-xs text-red-400">Data: {err.createdAt?.toDate ? err.createdAt.toDate().toLocaleString() : 'Recent'}</p>
                </div>
                <button 
                  onClick={() => {
                    setConfirmModal({
                      title: "Excluir Erro de Sistema",
                      message: "Deseja excluir este log de erro permanentemente?",
                      onConfirm: async () => {
                        try {
                          await deleteDoc(doc(db, 'system_errors', err.id));
                          setNotification({ message: 'Log excluído', type: 'success' });
                        } catch (e) {
                          setNotification({ message: 'Erro ao excluir', type: 'error' });
                        }
                      }
                    });
                  }}
                  className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-white/50 rounded-2xl border border-red-100">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Detalhes do Erro</p>
                <p className="text-red-900 text-sm font-mono break-all">{err.error}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-10 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
            Nenhum erro de sistema registrado.
          </div>
        )}

        <h3 className="text-xl font-bold text-slate-700 mt-8">Erros nas Questões</h3>
        {allErrors.length > 0 ? (
          allErrors.map((err) => (
            <div key={err.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              {/* ... (existing question error display) ... */}
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
                      if (err.status === 'pending') {
                        setResolvingError(err);
                        setSolutionText('');
                      } else {
                        try {
                          await updateDoc(doc(db, 'question_errors', err.id), {
                            status: 'pending',
                            updatedAt: serverTimestamp()
                          });
                        } catch (e) {
                          setNotification({ message: 'Erro ao atualizar status', type: 'error' });
                        }
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
                {err.solution && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Solução Tomada</p>
                    <p className="text-emerald-900 text-sm font-medium" translate="no">{err.solution}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
            Nenhum erro de questão relatado até o momento.
          </div>
        )}
      </div>

      <AnimatePresence>
        {resolvingError && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h3 className="text-xl font-bold">Resolver Erro</h3>
                <button onClick={() => setResolvingError(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição do Erro</p>
                  <p className="text-slate-700 text-sm italic">"{resolvingError.description}"</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Solução Tomada</label>
                  <textarea 
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    placeholder="Descreva o que foi feito para corrigir este erro..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none min-h-[120px]"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setResolvingError(null)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResolve}
                  disabled={!solutionText.trim()}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  Confirmar Solução
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
