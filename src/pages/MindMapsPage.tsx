import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MindMap } from '../types';

interface MindMapsPageProps {
  profile: any;
  onUpgrade: () => void;
}

export const MindMapsPage: React.FC<MindMapsPageProps> = ({ profile, onUpgrade }) => {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.isUpgraded) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'mind_maps'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const maps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MindMap));
      setMindMaps(maps);
      setLoading(false);
    }, (error) => {
      if (!error.message.toLowerCase().includes('permission') && !error.message.toLowerCase().includes('denied')) {
        handleFirestoreError(error, OperationType.LIST, 'mind_maps');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [profile?.isUpgraded]);

  const groupedMaps = React.useMemo(() => {
    const filtered = mindMaps.filter(map => 
      map.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      map.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filtered.reduce((acc, map) => {
      if (!acc[map.subject]) {
        acc[map.subject] = [];
      }
      acc[map.subject].push(map);
      return acc;
    }, {} as Record<string, MindMap[]>);
  }, [mindMaps, searchTerm]);

  const subjects = Object.keys(groupedMaps).sort();

  if (!profile?.isUpgraded) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-10 rounded-3xl text-white shadow-xl relative overflow-hidden text-center">
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Mapas Mentais Premium</h2>
            <p className="text-indigo-100 mb-8 text-lg">
              Tenha acesso a resumos visuais e mapas mentais exclusivos para acelerar sua memorização e aprendizado.
            </p>
            <button 
              onClick={onUpgrade}
              className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
            >
              Fazer Upgrade Agora
            </button>
          </div>
          <BookOpen className="absolute right-[-40px] bottom-[-40px] w-80 h-80 text-white/10 rotate-12" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {selectedSubject ? selectedSubject : 'Mapas Mentais'}
          </h2>
          <p className="text-slate-500">
            {selectedSubject ? 'Explore os mapas desta matéria.' : 'Selecione uma matéria para ver os mapas.'}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none shadow-sm"
          />
        </div>
        {selectedSubject && (
          <button 
            onClick={() => setSelectedSubject(null)}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
          >
            Voltar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">Nenhum mapa mental encontrado.</p>
        </div>
      ) : !selectedSubject ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map(subject => (
            <button
              key={subject}
              onClick={() => { setSelectedSubject(subject); setSearchTerm(''); }}
              className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow text-left font-bold text-slate-900 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              {subject}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupedMaps[selectedSubject]
            .filter(map => map.subject.toLowerCase().includes(searchTerm.toLowerCase()) || map.content.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(map => (
            <div key={map.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-bold text-slate-900 mb-4">{map.questionNumber ? `Questão ${map.questionNumber}` : 'Mapa Mental'}</h4>
              <div className="w-full [&_img]:w-full [&_img]:h-auto [&_img]:object-contain" dangerouslySetInnerHTML={{ __html: map.content }} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
