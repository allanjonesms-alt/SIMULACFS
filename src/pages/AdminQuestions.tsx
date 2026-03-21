import React, { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, Database, Search, BookOpen, X, Save,
  Book, ChevronLeft, Download, Eye, Edit2, Trash2,
  CheckCircle2, Loader2, Star, Zap
} from 'lucide-react';
import { 
  doc, deleteDoc, updateDoc, addDoc, collection, serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Question, UserProfile } from '../types';
import { useQuestions } from '../hooks/useQuestions';
import SubjectPage from '../components/SubjectPage';
import Lei1102 from './subjects/Lei1102';
import Lei053 from './subjects/Lei053';
import Lei127 from './subjects/Lei127';
import Decreto1093 from './subjects/Decreto1093';
import RDPMMS from './subjects/RDPMMS';
import ConselhoDisciplina from './subjects/ConselhoDisciplina';
import LinguaPortuguesa from './subjects/LinguaPortuguesa';
import Leis from './subjects/Leis';

interface AdminQuestionsProps {
  profile: UserProfile | null;
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: { title: string; message: string; onConfirm: () => void } | null) => void;
  downloadPDF: (law: string) => void;
  onBack: () => void;
}

const FormatButtons = ({ onInsert }: { onInsert: (start: string, end: string) => void }) => (
  <div className="flex gap-2 mb-2">
    <button type="button" onClick={() => onInsert('**', '**')} className="px-2 py-1 bg-slate-100 rounded text-xs font-bold hover:bg-slate-200">Negrito</button>
    <button type="button" onClick={() => onInsert('<u>', '</u>')} className="px-2 py-1 bg-slate-100 rounded text-xs font-bold hover:bg-slate-200 underline">Sublinhado</button>
  </div>
);

const AdminQuestions: React.FC<AdminQuestionsProps> = ({
  profile,
  setNotification,
  setConfirmModal,
  downloadPDF,
  onBack
}) => {
  const { questions } = useQuestions();
  const handleInsert = (textareaRef: React.RefObject<HTMLTextAreaElement | null>, setter: React.Dispatch<React.SetStateAction<any>>, start: string, end: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(startPos, endPos);
    const newText = text.substring(0, startPos) + start + selectedText + end + text.substring(endPos);
    setter((prev: any) => prev ? ({ ...prev, text: newText }) : null);
    
    // Focus back to textarea and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + start.length, endPos + start.length);
    }, 0);
  };

  const [selectedAdminLaw, setSelectedAdminLaw] = useState<string | null>(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const newQuestionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewSelectedOptionIdx, setPreviewSelectedOptionIdx] = useState<number | null>(null);
  const [previewShowFeedback, setPreviewShowFeedback] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', '', ''],
    correctOption: 0,
    law: ''
  });

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    console.log("Salvando questão:", editingQuestion.text);
    setIsSaving(true);
    try {
      const { id, ...data } = editingQuestion;
      await updateDoc(doc(db, 'questions', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      console.log("Questão salva com sucesso no Firestore");
      setNotification({ message: 'Questão atualizada com sucesso!', type: 'success' });
      setIsSuccess(true);
      setTimeout(() => {
        setEditingQuestion(null);
        setIsSuccess(false);
        setIsSaving(false);
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar questão:", error);
      handleFirestoreError(error, OperationType.UPDATE, `questions/${editingQuestion.id}`);
      setNotification({ message: 'Erro ao atualizar questão', type: 'error' });
      setIsSaving(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.text || !newQuestion.law) {
      setNotification({ message: 'Preencha o enunciado e a lei', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'questions'), {
        ...newQuestion,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNotification({ message: 'Questão criada com sucesso!', type: 'success' });
      setIsSuccess(true);
      setTimeout(() => {
        setIsAddingQuestion(false);
        setIsSuccess(false);
        setIsSaving(false);
        setNewQuestion({
          text: '',
          options: ['', '', '', '', ''],
          correctOption: 0,
          law: '',
          category: '',
          justification: ''
        });
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questions');
      setNotification({ message: 'Erro ao criar questão', type: 'error' });
      setIsSaving(false);
    }
  };

  const props = {
    onBack: () => setSelectedAdminLaw(null),
    onDownloadPDF: downloadPDF,
    onPreview: (q: Question) => {
      setPreviewQuestion(q);
      setPreviewSelectedOptionIdx(null);
      setPreviewShowFeedback(false);
    },
    onEdit: (q: Question) => {
      setEditingQuestion(q);
    },
    onDelete: (q: Question) => {
      setConfirmModal({
        title: "Excluir Questão",
        message: "Tem certeza que deseja excluir esta questão permanentemente?",
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'questions', q.id));
            setNotification({ message: 'Questão excluída', type: 'success' });
          } catch (e) {
            setNotification({ message: 'Erro ao excluir', type: 'error' });
          }
        }
      });
    },
    onAdd: () => {
      setNewQuestion({ ...newQuestion, law: selectedAdminLaw || '' });
      setIsAddingQuestion(true);
    },
    profile: profile,
    setNotification: setNotification,
    setConfirmModal: setConfirmModal,
  };

  return (
    <motion.div key="admin_questions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {!selectedAdminLaw ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600" />
              </button>
              <h2 className="text-3xl font-bold text-slate-900">BANCO DE QUESTÕES</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => {
                  setNewQuestion({ ...newQuestion, law: '' });
                  setIsAddingQuestion(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
              >
                <PlusCircle className="w-5 h-5" />
                Nova Questão
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fácil</p>
                <p className="text-xl font-black text-slate-900">{questions.filter(q => (q.difficulty || 0) > 0 && (q.difficulty || 0) <= 2).length}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média</p>
                <p className="text-xl font-black text-slate-900">{questions.filter(q => (q.difficulty || 0) === 3).length}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difícil</p>
                <p className="text-xl font-black text-slate-900">{questions.filter(q => (q.difficulty || 0) >= 4).length}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem Classificação</p>
                <p className="text-xl font-black text-slate-900">{questions.filter(q => !q.difficulty || q.difficulty === 0).length}</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-xl mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar em todas as questões..."
              value={adminSearchTerm}
              onChange={(e) => setAdminSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>

          {adminSearchTerm.trim() !== '' ? (
            <SubjectPage 
              law="Resultados da Busca" 
              questions={questions.filter(q => q.text.toLowerCase().includes(adminSearchTerm.toLowerCase()))}
              onBack={() => setAdminSearchTerm('')}
              onDownloadPDF={() => {}}
              onPreview={(q) => {
                setPreviewQuestion(q);
                setPreviewSelectedOptionIdx(null);
                setPreviewShowFeedback(false);
              }}
              onEdit={(q) => setEditingQuestion(q)}
              onDelete={(q) => {
                setConfirmModal({
                  title: "Excluir Questão",
                  message: "Tem certeza que deseja excluir esta questão permanentemente?",
                  onConfirm: async () => {
                    try {
                      await deleteDoc(doc(db, 'questions', q.id));
                      setNotification({ message: 'Questão excluída', type: 'success' });
                    } catch (e) {
                      setNotification({ message: 'Erro ao excluir', type: 'error' });
                    }
                  }
                });
              }}
              onAdd={() => {
                setNewQuestion({ ...newQuestion, law: '' });
                setIsAddingQuestion(true);
              }}
              disableLawFilter={true}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {Object.entries(questions.reduce((acc, q) => {
                  let subject = q.law || q.category || 'Sem Matéria';
                  if (subject === 'Leis') subject = 'Provas Anteriores';
                  acc[subject] = (acc[subject] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([subject, count]) => (
                  <div 
                    key={subject} 
                    onClick={() => setSelectedAdminLaw(subject)}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-600 hover:shadow-md transition-all group"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-indigo-400">{subject}</p>
                      <p className="text-2xl font-black text-slate-900">{count}</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {questions.length === 0 && (
                <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                  Nenhuma questão cadastrada. Use os botões acima para começar.
                </div>
              )}
            </>
          )}
        </>
      ) : (
        (() => {
          switch (selectedAdminLaw) {
            case 'Lei 1.102/90':
              return <Lei1102 {...props} isAdmin={true} />;
            case 'Lei 053/1990':
              return <Lei053 {...props} isAdmin={true} />;
            case 'Lei 127/2008':
              return <Lei127 {...props} isAdmin={true} />;
            case 'Decreto 1.093/81':
              return <Decreto1093 {...props} isAdmin={true} />;
            case 'RDPMMS':
              return <RDPMMS {...props} isAdmin={true} />;
            case 'Conselho de Disciplina':
              return <ConselhoDisciplina {...props} isAdmin={true} />;
            case 'Língua Portuguesa':
              return <LinguaPortuguesa {...props} isAdmin={true} />;
            case 'Provas Anteriores':
              return <Leis {...props} isAdmin={true} />;
            default:
              return <SubjectPage law={selectedAdminLaw} {...props} isAdmin={true} />;
          }
        })()
      )}

      {/* Modal Editar */}
      <AnimatePresence>
        {editingQuestion && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button 
                onClick={() => {
                  setEditingQuestion(null);
                  setIsSuccess(false);
                  setIsSaving(false);
                }} 
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Questão Atualizada!</h3>
                    <p className="text-slate-500">As alterações foram salvas com sucesso.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-2xl font-bold mb-6">Editar Questão</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Enunciado</label>
                        <FormatButtons onInsert={(s, e) => handleInsert(editingTextareaRef, setEditingQuestion, s, e)} />
                        <textarea 
                          ref={editingTextareaRef}
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" 
                          rows={3}
                          value={editingQuestion.text}
                          translate="no"
                          onChange={(e) => setEditingQuestion(prev => prev ? {...prev, text: e.target.value} : null)}
                        />
                      </div>
                      {editingQuestion.options.map((opt, i) => (
                        <div key={i}>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Alternativa {String.fromCharCode(65 + i)}</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                            value={opt}
                            translate="no"
                            onChange={(e) => {
                              const newOpts = [...editingQuestion.options];
                              newOpts[i] = e.target.value;
                              setEditingQuestion({...editingQuestion, options: newOpts});
                            }}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Índice da Correta (0-4)</label>
                        <input 
                          type="number" 
                          min="0" max="4"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                          value={editingQuestion.correctOption}
                          onChange={(e) => setEditingQuestion({...editingQuestion, correctOption: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Lei / Matéria</label>
                        <select 
                          className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                          value={editingQuestion.law || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updates: any = { law: val };
                            if (val === 'Provas Anteriores') {
                              updates.category = 'Provas Anteriores';
                            }
                            setEditingQuestion({...editingQuestion, ...updates});
                          }}
                        >
                          <option value="">Sem Lei</option>
                          <option value="Lei 1.102/90">Lei 1.102/90</option>
                          <option value="Lei 053/1990">Lei 053/1990</option>
                          <option value="Lei 127/2008">Lei 127/2008</option>
                          <option value="Decreto 1.093/81">Decreto 1.093/81</option>
                          <option value="RDPMMS">RDPMMS</option>
                          <option value="Conselho de Disciplina">Conselho de Disciplina</option>
                          <option value="Língua Portuguesa">Língua Portuguesa</option>
                          <option value="Provas Anteriores">Provas Anteriores</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                        <input 
                          type="text" 
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                          value={editingQuestion.category || ''}
                          placeholder="Ex: Direito Administrativo, Provas Anteriores..."
                          onChange={(e) => setEditingQuestion({...editingQuestion, category: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Justificativa</label>
                        <textarea 
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" 
                          rows={3}
                          value={editingQuestion.justification || ''}
                          placeholder="Explicação da resposta correta..."
                          onChange={(e) => setEditingQuestion({...editingQuestion, justification: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button 
                        onClick={() => setEditingQuestion(null)}
                        className="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        disabled={isSaving}
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveQuestion}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Questão */}
      <AnimatePresence>
        {isAddingQuestion && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button 
                onClick={() => {
                  setIsAddingQuestion(false);
                  setIsSuccess(false);
                  setIsSaving(false);
                }} 
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                      <PlusCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Questão Criada!</h3>
                    <p className="text-slate-500">A nova questão foi registrada com sucesso no banco de dados.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-2xl font-bold mb-6">Nova Questão</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Enunciado</label>
                        <FormatButtons onInsert={(s, e) => handleInsert(newQuestionTextareaRef, setNewQuestion, s, e)} />
                        <textarea 
                          ref={newQuestionTextareaRef}
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" 
                          rows={3}
                          value={newQuestion.text}
                          translate="no"
                          onChange={(e) => setNewQuestion(prev => ({...prev, text: e.target.value}))}
                        />
                      </div>
                      {newQuestion.options?.map((opt, i) => (
                        <div key={i}>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Alternativa {String.fromCharCode(65 + i)}</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                            value={opt}
                            translate="no"
                            onChange={(e) => {
                              const newOpts = [...(newQuestion.options || [])];
                              newOpts[i] = e.target.value;
                              setNewQuestion({...newQuestion, options: newOpts});
                            }}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Índice da Correta (0-4)</label>
                        <input 
                          type="number" 
                          min="0" max="4"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                          value={newQuestion.correctOption}
                          onChange={(e) => setNewQuestion({...newQuestion, correctOption: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Lei / Matéria</label>
                        <select 
                          className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                          value={newQuestion.law || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updates: any = { law: val };
                            if (val === 'Provas Anteriores') {
                              updates.category = 'Provas Anteriores';
                            }
                            setNewQuestion({...newQuestion, ...updates});
                          }}
                        >
                          <option value="">Selecione a Lei</option>
                          <option value="Lei 1.102/90">Lei 1.102/90</option>
                          <option value="Lei 053/1990">Lei 053/1990</option>
                          <option value="Lei 127/2008">Lei 127/2008</option>
                          <option value="Decreto 1.093/81">Decreto 1.093/81</option>
                          <option value="RDPMMS">RDPMMS</option>
                          <option value="Conselho de Disciplina">Conselho de Disciplina</option>
                          <option value="Língua Portuguesa">Língua Portuguesa</option>
                          <option value="Provas Anteriores">Provas Anteriores</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                        <input 
                          type="text" 
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                          value={newQuestion.category || ''}
                          placeholder="Ex: Direito Administrativo, Provas Anteriores..."
                          onChange={(e) => setNewQuestion({...newQuestion, category: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Justificativa</label>
                        <textarea 
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" 
                          rows={3}
                          value={newQuestion.justification || ''}
                          placeholder="Explicação da resposta correta..."
                          onChange={(e) => setNewQuestion({...newQuestion, justification: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button 
                        onClick={() => setIsAddingQuestion(false)}
                        className="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        disabled={isSaving}
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleCreateQuestion}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <PlusCircle className="w-5 h-5" />
                        )}
                        {isSaving ? 'Criando...' : 'Criar Questão'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Visualizar Questão</h3>
              <button onClick={() => setPreviewQuestion(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="text-lg text-slate-800 leading-relaxed font-medium [&_strong]:font-bold [&_u]:underline" translate="no">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{previewQuestion.text}</ReactMarkdown>
              </div>
              
              <div className="space-y-3">
                {previewQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPreviewSelectedOptionIdx(idx);
                      setPreviewShowFeedback(true);
                    }}
                    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
                      previewShowFeedback
                        ? idx === previewQuestion.correctOption
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          : idx === previewSelectedOptionIdx
                            ? 'bg-rose-50 border-rose-500 text-rose-900'
                            : 'bg-white border-slate-100 opacity-50'
                        : 'bg-white border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        previewShowFeedback && idx === previewQuestion.correctOption
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium" translate="no">{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminQuestions;
