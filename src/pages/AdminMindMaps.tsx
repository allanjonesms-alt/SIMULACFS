import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, Edit2, X, BookOpen, Eye, Layout } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MindMap } from '../types';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface AdminMindMapsProps {
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: { title: string; message: string; onConfirm: () => void } | null) => void;
}

const AdminMindMaps: React.FC<AdminMindMapsProps> = ({ setNotification, setConfirmModal }) => {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMap, setCurrentMap] = useState<Partial<MindMap>>({ subject: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

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

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" /> Gerenciar Mapas Mentais
        </h3>
        {!isEditing && (
          <button 
            onClick={() => {
              setCurrentMap({ subject: '', content: '' });
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
            <label className="block text-sm font-bold text-slate-700 mb-1">Assunto</label>
            <input 
              type="text" 
              value={currentMap.subject}
              onChange={(e) => setCurrentMap(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Lei 11.02/90 - Direitos"
              disabled={saving}
            />
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
            <div className="grid grid-cols-1 gap-4">
              {mindMaps.map((map) => (
                <div key={map.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div>
                    <h4 className="font-bold text-slate-800">{map.subject}</h4>
                    <p className="text-xs text-slate-400">
                      Criado em: {map.createdAt?.toDate?.()?.toLocaleDateString() || 'Recente'}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setCurrentMap({
                          ...map,
                          subject: map.subject || '',
                          content: map.content || ''
                        });
                        setIsEditing(true);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(map.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
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
