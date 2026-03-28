import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Question } from '../types';
import { User } from 'firebase/auth';

interface ErrorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  user: User | null;
  setConfirmModal: (modal: { title: string; message: React.ReactNode; onConfirm: () => void } | null) => void;
}

export const ErrorReportModal: React.FC<ErrorReportModalProps> = ({ isOpen, onClose, question, user, setConfirmModal }) => {
  const [errorDescription, setErrorDescription] = useState('');

  const handleReportError = async () => {
    if (!user || !question || !errorDescription.trim()) return;

    try {
      await addDoc(collection(db, 'question_errors'), {
        questionId: question.id,
        questionText: question.text,
        userEmail: user.email || 'Anônimo',
        userId: user.uid,
        description: errorDescription.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onClose();
      setErrorDescription('');
      
      setConfirmModal({
        title: "Obrigado!",
        message: "Sua correção foi enviada com sucesso. Iremos analisar a questão para melhorar nossos serviços.",
        onConfirm: () => setConfirmModal(null)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'question_errors');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && question && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Informar Erro</h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Questão Selecionada</p>
                <p className="text-slate-700 text-sm line-clamp-3 italic" translate="no">
                  "{question.text}"
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descreva o erro encontrado</label>
                <textarea 
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-0 transition-all outline-none" 
                  rows={4}
                  value={errorDescription}
                  onChange={(e) => setErrorDescription(e.target.value)}
                  placeholder="Ex: A alternativa correta está errada, erro de digitação, etc..."
                  translate="no"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleReportError}
                  disabled={!errorDescription.trim()}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-indigo-200"
                >
                  Enviar Relatório
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
