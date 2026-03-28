import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, Edit2, X, BookOpen, Eye, Layout } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MindMap } from '../types';
import { useQuestions } from '../hooks/useQuestions';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface AdminMindMapsProps {
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: { title: string; message: React.ReactNode; onConfirm: () => void } | null) => void;
}

const AdminMindMaps: React.FC<AdminMindMapsProps> = ({ setNotification, setConfirmModal }) => {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMap, setCurrentMap] = useState<Partial<MindMap>>({ subject: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const { questions } = useQuestions();

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  useEffect(() => {
    const q = query(collection(db, 'mind_maps'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const maps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MindMap));
      setMindMaps(maps);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mind_maps');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSave = async () => {
    const isContentEmpty = !currentMap.content || currentMap.content === '<p><br></p>' || currentMap.content.trim() === '';
    
    if (!currentMap.subject?.trim() || isContentEmpty) {
      setNotification({ message: 'Preencha o assunto e o conteúdo do mapa mental.', type: 'error' });
      return;
    }

    // Check size before saving
    const contentSize = new Blob([currentMap.content]).size;
    if (contentSize > 900 * 1024) {
      setNotification({ message: 'O conteúdo é muito grande (mais de 900KB). Tente remover algumas imagens ou reduzir o tamanho.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (currentMap.id) {
        const mapRef = doc(db, 'mind_maps', currentMap.id);
        await updateDoc(mapRef, {
          subject: currentMap.subject.trim(),
          content: currentMap.content,
          updatedAt: serverTimestamp()
        });
        setNotification({ message: 'Mapa Mental atualizado com sucesso!', type: 'success' });
      } else {
        await addDoc(collection(db, 'mind_maps'), {
          subject: currentMap.subject.trim(),
          content: currentMap.content,
          createdAt: serverTimestamp()
        });
        setNotification({ message: 'Mapa Mental criado com sucesso!', type: 'success' });
      }
      setIsEditing(false);
      setCurrentMap({ subject: '', content: '' });
      setActiveTab('edit');
    } catch (error: any) {
      console.error('Erro ao salvar mapa mental:', error);
      let errorMessage = `Erro ao salvar: ${error.message || 'Erro desconhecido'}`;
      
      if (error.message?.includes('permission-denied')) {
        errorMessage = 'Erro de permissão. Você tem certeza que é um administrador?';
      } else if (error.message?.includes('too large')) {
        errorMessage = 'O conteúdo é muito grande. Tente reduzir o tamanho do mapa mental.';
      }
      
      setNotification({ message: errorMessage, type: 'error' });
      handleFirestoreError(error, OperationType.WRITE, 'mind_maps');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      title: 'Excluir Mapa Mental',
      message: 'Tem certeza que deseja excluir este mapa mental? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'mind_maps', id));
          setNotification({ message: 'Mapa Mental excluído com sucesso!', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'mind_maps');
        }
      }
    });
  };

  const subjects = React.useMemo(() => {
    const set = new Set<string>();
    
    // Add base subjects
    const baseSubjects = [
      'Lei 1.102/90',
      'Lei 053/1990',
      'Lei 127/2008',
      'Decreto 1.093/81',
      'RDPMMS',
      'Conselho de Disciplina',
      'Língua Portuguesa',
      'Leis Extravagantes',
      'Provas Anteriores'
    ];
    baseSubjects.forEach(s => set.add(s));

    // Add subjects from questions
    questions.forEach(q => {
      if (q.law) set.add(q.law);
      if (q.category) set.add(q.category);
    });

    // Add subjects from existing mind maps
    mindMaps.forEach(m => {
      if (m.subject) set.add(m.subject);
    });

    return Array.from(set).filter(s => s && s.trim() !== '').sort();
  }, [questions, mindMaps]);

  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const groupedMaps = React.useMemo(() => {
    const grouped: Record<string, MindMap[]> = {};
    mindMaps.forEach(map => {
      const subject = map.subject || 'Sem Matéria';
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(map);
    });
    return grouped;
  }, [mindMaps]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" /> Gerenciar Mapas Mentais
        </h3>
        {!isEditing && (
          <button 
            onClick={() => {
              setCurrentMap({ subject: subjects[0], content: '' });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" /> Novo Mapa Mental
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Matéria</label>
            <select 
              value={currentMap.subject}
              onChange={(e) => setCurrentMap(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              disabled={saving}
            >
              <option value="" disabled>Selecione uma matéria</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
              {/* Allow existing subjects that might not be in the list yet */}
              {currentMap.subject && !subjects.includes(currentMap.subject) && (
                <option value={currentMap.subject}>{currentMap.subject}</option>
              )}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">Conteúdo (HTML)</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Layout className="w-3 h-3" /> Editar
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Eye className="w-3 h-3" /> Visualizar
                </button>
              </div>
            </div>
            
            {activeTab === 'edit' ? (
              <div className="h-96 mb-12">
                <ReactQuill 
                  key={currentMap.id || 'new'}
                  theme="snow"
                  value={currentMap.content || ''}
                  onChange={(content) => setCurrentMap(prev => ({ ...prev, content }))}
                  modules={quillModules}
                  className="h-full rounded-xl overflow-hidden"
                  placeholder="Digite o conteúdo do mapa mental aqui..."
                  readOnly={saving}
                />
              </div>
            ) : (
              <div className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-slate-50 h-96 overflow-y-auto prose prose-indigo max-w-none break-words whitespace-normal">
                <div dangerouslySetInnerHTML={{ __html: currentMap.content || '*Nenhum conteúdo para visualizar*' }} />
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-5 h-5" /> {saving ? 'Salvando...' : 'Salvar Mapa Mental'}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" /> Cancelar
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Carregando mapas mentais...</div>
          ) : mindMaps.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Nenhum mapa mental cadastrado.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedMaps).map(([subject, maps]) => (
                <div key={subject} className="border border-slate-100 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}
                    className={`w-full flex items-center justify-between p-4 font-bold transition-all ${expandedSubject === subject ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-6 rounded-full ${expandedSubject === subject ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                      {subject}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-400">
                        {maps.length} {maps.length === 1 ? 'item' : 'itens'}
                      </span>
                      <Layout className={`w-4 h-4 transition-transform ${expandedSubject === subject ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {expandedSubject === subject && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="bg-slate-50/50 p-4 space-y-2 border-t border-slate-100"
                    >
                      {maps.map((map) => (
                        <div key={map.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{map.subject}</h4>
                            <p className="text-[10px] text-slate-400">
                              Criado em: {map.createdAt?.toDate?.()?.toLocaleDateString() || 'Recente'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setCurrentMap({
                                  ...map,
                                  subject: map.subject || '',
                                  content: map.content || ''
                                });
                                setIsEditing(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(map.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMindMaps;
