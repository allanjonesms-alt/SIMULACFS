import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronRight, Search, X } from 'lucide-react';
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
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(null);

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

  const filteredMaps = mindMaps.filter(map => 
    map.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Mapas Mentais</h2>
          <p className="text-slate-500">Resumos visuais para facilitar seu aprendizado.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar assunto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredMaps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">Nenhum mapa mental encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaps.map((map) => (
            <motion.div 
              key={map.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedMap(map)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                <BookOpen className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                {map.subject}
              </h3>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-400">Clique para visualizar</span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedMap && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">{selectedMap.subject}</h3>
                <button 
                  onClick={() => setSelectedMap(null)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-12 prose prose-indigo max-w-none break-words whitespace-normal">
                <div dangerouslySetInnerHTML={{ __html: selectedMap.content }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
