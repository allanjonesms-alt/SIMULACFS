import React from 'react';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UpgradeRequest } from '../types';
import { Trash2, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface UpgradeRequestsProps {
  onBack: () => void;
}

const UpgradeRequestsPage: React.FC<UpgradeRequestsProps> = ({ onBack }) => {
  const [requests, setRequests] = React.useState<UpgradeRequest[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, 'upgrade_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpgradeRequest));
      console.log('Upgrade requests in UpgradeRequestsPage:', data);
      setRequests(data);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'upgrade_requests'));
    return () => unsubscribe();
  }, []);

  const removeRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'upgrade_requests', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'upgrade_requests'); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Voltar
      </button>
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Solicitações de Upgrade</h2>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0">
            <div>
              <p className="font-bold text-slate-900">{req.displayName}</p>
              <p className="text-sm text-slate-500">{req.email}</p>
            </div>
            <button onClick={() => removeRequest(req.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default UpgradeRequestsPage;
