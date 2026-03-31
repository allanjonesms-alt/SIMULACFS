import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, RotateCcw, BarChart2 } from 'lucide-react';
import { 
  collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs, where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CutoffPollData } from '../types';

interface CutoffPollProps {
  userId: string;
}

export const CutoffPoll: React.FC<CutoffPollProps> = ({ userId }) => {
  const [votes, setVotes] = useState<CutoffPollData[]>([]);
  const [userVote, setUserVote] = useState<CutoffPollData | null>(null);
  const [sliderValue, setSliderValue] = useState(40);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'cutoff_polls'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CutoffPollData));
      setVotes(vList);
      setUserVote(vList.find(v => v.userId === userId) || null);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'cutoff_polls'));
    return unsubscribe;
  }, [userId]);

  const handleVote = async () => {
    setIsVoting(true);
    try {
      await addDoc(collection(db, 'cutoff_polls'), {
        userId,
        score: sliderValue,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cutoff_polls');
    } finally {
      setIsVoting(false);
    }
  };

  const handleRetake = async () => {
    if (!userVote) return;
    setIsVoting(true);
    try {
      await deleteDoc(doc(db, 'cutoff_polls', userVote.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'cutoff_polls');
    } finally {
      setIsVoting(false);
    }
  };

  const averageScore = votes.length > 0 
    ? (votes.reduce((acc, v) => acc + v.score, 0) / votes.length).toFixed(1)
    : '0';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-indigo-600" />
        Enquete: Na sua opinião qual será a Nota de Corte?
      </h3>

      {userVote ? (
        <div className="text-center">
          <p className="text-slate-600 mb-2">Média da opinião da nota de corte:</p>
          <div className="text-5xl font-black text-indigo-600 mb-6">{averageScore}</div>
          <p className="text-sm text-slate-500 mb-4">Seu voto: {userVote.score} acertos</p>
          <button 
            onClick={handleRetake}
            disabled={isVoting}
            className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Refazer sua opinião
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
              <span>30</span>
              <span className="text-indigo-600 text-lg">{sliderValue}</span>
              <span>50</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="50" 
              value={sliderValue} 
              onChange={(e) => setSliderValue(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          <button 
            onClick={handleVote}
            disabled={isVoting}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            Votar
          </button>
        </div>
      )}
    </div>
  );
};
