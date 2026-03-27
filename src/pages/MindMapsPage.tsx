import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, X, ChevronRight, ChevronLeft, Shuffle } from 'lucide-react';
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
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  useEffect(() => {
    if (!profile?.isUpgraded) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'mind_maps'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const maps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MindMap));
      setMindMaps(maps);
      if (maps.length > 0 && currentIndex === -1) {
        setCurrentIndex(Math.floor(Math.random() * maps.length));
      }
      setLoading(false);
    }, (error) => {
      // Ignore permission errors as we handle them in the UI
      if (!error.message.toLowerCase().includes('permission') && !error.message.toLowerCase().includes('denied')) {
        handleFirestoreError(error, OperationType.LIST, 'mind_maps');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [profile?.isUpgraded]);

  const filteredMaps = React.useMemo(() => {
    return mindMaps.filter(map => 
      map.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mindMaps, searchTerm]);

  // If search term changes, reset index if current map is no longer in filtered list
  useEffect(() => {
    if (filteredMaps.length > 0) {
      const currentMap = mindMaps[currentIndex];
      const stillExists = currentMap && filteredMaps.some(m => m.id === currentMap.id);
      if (!stillExists) {
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex(-1);
    }
  }, [searchTerm, filteredMaps]);

  const handleNext = () => {
    if (filteredMaps.length <= 1) return;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * filteredMaps.length);
    } while (nextIndex === filteredMaps.indexOf(filteredMaps.find(m => m.id === filteredMaps[currentIndex]?.id) || filteredMaps[0]) && filteredMaps.length > 1);
    
    const nextMap = filteredMaps[nextIndex];
    const globalIndex = mindMaps.findIndex(m => m.id === nextMap.id);
    setCurrentIndex(globalIndex);
  };

  const currentMap = mindMaps[currentIndex];

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
          <h2 className="text-3xl font-bold text-slate-900">Galeria de Mapas Mentais</h2>
          <p className="text-slate-500">Explore resumos visuais um por um.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : !currentMap ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">Nenhum mapa mental encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{currentMap.subject}</h3>
            </div>
            <div className="text-sm font-bold text-slate-400">
              {filteredMaps.indexOf(currentMap) + 1} / {filteredMaps.length}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentMap.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col w-full md:max-w-2xl md:mx-auto"
            >
              <div className="flex-1 p-4 md:p-8 bg-white flex items-center justify-center">
                <div className="w-full [&_img]:w-full [&_img]:h-auto [&_img]:object-contain" dangerouslySetInnerHTML={{ __html: currentMap.content }} />
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-4 pt-6">
            <button 
              onClick={handleNext}
              className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 group"
            >
              <Shuffle className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              PROXIMO
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
