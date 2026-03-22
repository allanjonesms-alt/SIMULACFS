import React from 'react';
import { updateDoc, doc, collection, query, where, getDocs, writeBatch, getDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, SimulationResult } from '../types';
import { Users as UsersIcon, Zap, UserCheck, UserX, Trash2, Search, FileText, Award, MessageCircle, UserMinus } from 'lucide-react';
import { motion } from 'motion/react';
import StatCard from '../components/StatCard';

interface UsersProps {
  allSimulations: SimulationResult[];
  allUsers: UserProfile[];
  setAllUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  onViewChange: (view: 'inactive') => void;
}

const UsersPage: React.FC<UsersProps> = ({ allSimulations, allUsers, setAllUsers, onViewChange }) => {
  const deleteUserSimulations = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar todos os mini-simulados deste usuário?')) return;
    try {
      const q = query(collection(db, 'simulations'), where('userId', '==', userId), where('isMiniSimulado', '==', true));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      alert('Mini-simulados deletados com sucesso!');
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'simulations'); }
  };

  const [searchTerm, setSearchTerm] = React.useState('');
  
  const deleteUserAccount = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este usuário e todos os seus dados? Esta ação não pode ser desfeita.')) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Delete user document
      batch.delete(doc(db, 'users', userId));
      
      // 2. Delete active simulation
      batch.delete(doc(db, 'active_simulations', userId));
      
      // 3. Delete all simulations
      const q = query(collection(db, 'simulations'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      
      setAllUsers(prev => prev.filter(u => u.uid !== userId));
      alert('Usuário e todos os seus dados excluídos com sucesso!');
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'users'); }
  };

  const filteredUsers = allUsers.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div key="admin_users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Gestão de Usuários</h2>
        <button onClick={() => onViewChange('inactive')} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
          <UserMinus className="w-5 h-5" /> Usuários Inativos
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total de Simulados" value={allSimulations.filter(s => !s.isMiniSimulado).length} icon={<UsersIcon className="text-indigo-600" />} />
        <StatCard label="Média de Acertos" value={allSimulations.filter(s => !s.isMiniSimulado).length > 0 ? `${(allSimulations.filter(s => !s.isMiniSimulado).reduce((a, b) => a + b.score, 0) / allSimulations.filter(s => !s.isMiniSimulado).length).toFixed(1)}` : '0'} icon={<Zap className="text-emerald-600" />} />
        <StatCard label="Total de Usuários" value={allUsers.length} icon={<UsersIcon className="text-slate-600" />} />
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-2xl">
            <Zap className="text-amber-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Distribuição</p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-slate-900">{allUsers.filter(u => u.isUpgraded).length}</span>
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Premium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-slate-900">{allUsers.filter(u => !u.isUpgraded).length}</span>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Gratuitos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          className="w-full p-4 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          id="search-user-email"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((u) => (
          <div key={u.uid} className={`rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-52 ${u.isUpgraded ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src={u.photoURL} className="w-12 h-12 rounded-2xl border border-slate-100 shadow-sm" alt="" />
                <div className="overflow-hidden">
                  <p className="font-bold text-slate-900 leading-tight truncate">{u.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  <input
                    type="text"
                    placeholder="Telefone (5567...)"
                    className="text-xs mt-1 p-1 w-full rounded border border-slate-200"
                    value={u.phone || ''}
                    onChange={async (e) => {
                      const newPhone = e.target.value;
                      setAllUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, phone: newPhone } : user));
                      try {
                        await updateDoc(doc(db, 'users', u.uid), { phone: newPhone });
                      } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                    }}
                  />
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {allSimulations.filter(s => s.userId === u.uid && s.isMiniSimulado !== true).length}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                      <Award className="w-4 h-4 text-amber-500" />
                      {(() => {
                        const userSims = allSimulations.filter(s => s.userId === u.uid && s.isMiniSimulado !== true);
                        if (userSims.length === 0) return '0%';
                        const avg = userSims.reduce((acc, s) => acc + (s.score / s.totalQuestions) * 100, 0) / userSims.length;
                        return `${avg.toFixed(1)}%`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteUserAccount(u.uid)}
                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                title="Excluir Usuário"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.isUpgraded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                {u.isUpgraded ? 'Premium' : 'Gratuito'}
              </span>
              <div className="flex items-center gap-2">
                {u.phone && (
                  <a
                    href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
                <button 
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'users', u.uid), { isUpgraded: !u.isUpgraded });
                      setAllUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, isUpgraded: !user.isUpgraded } : user));
                    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    u.isUpgraded ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={u.isUpgraded ? 'Tornar Gratuito' : 'Tornar Premium'}
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'users', u.uid), { isActive: !u.isActive });
                      setAllUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, isActive: !user.isActive } : user));
                    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    u.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                  }`}
                >
                  {u.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default UsersPage;
