import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, PlusCircle, AlertTriangle, ChevronLeft, LayoutDashboard, BookOpen, BarChart3, RefreshCw, FileText } from 'lucide-react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import UsersPage from './Users';
import AdminQuestions from './AdminQuestions';
import SimulationLogsPage from './SimulationLogs';
import AdminMindMaps from './AdminMindMaps';
import VersionControl from './VersionControl';
import { ErrorReportPage } from '../components/ErrorReportPage';
import { UserProfile, SimulationResult, QuestionError } from '../types';
import StatCard from '../components/StatCard';

interface AdminProps {
  user: any;
  profile: UserProfile | null;
  allSimulations: SimulationResult[];
  allUsers: UserProfile[];
  setAllUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  allErrors: QuestionError[];
  setAllErrors: React.Dispatch<React.SetStateAction<QuestionError[]>>;
  setAllSimulations: React.Dispatch<React.SetStateAction<SimulationResult[]>>;
  allPageVisits: any[];
  allActiveSimulations: any[];
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setConfirmModal: (modal: { title: string; message: React.ReactNode; onConfirm: () => void } | null) => void;
  downloadPDF: (law: string) => void;
  onBack: () => void;
}

const AdminPage: React.FC<AdminProps> = ({
  user,
  profile,
  allSimulations,
  allUsers,
  setAllUsers,
  allErrors,
  setAllErrors,
  setAllSimulations,
  allPageVisits,
  allActiveSimulations,
  setNotification,
  setConfirmModal,
  downloadPDF,
  onBack
}) => {
  const [adminView, setAdminView] = React.useState<'users' | 'questions' | 'errors' | 'logs' | 'mindmaps' | 'versions' | null>(null);

  const todayVisits = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const uniqueUsers = new Set(
      allPageVisits
        .filter(v => v.pageName === 'dashboard')
        .filter(v => {
          const visitDate = v.createdAt?.toDate?.()?.toISOString().split('T')[0] || 
                            (v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toISOString().split('T')[0] : '');
          return visitDate === today;
        })
        .map(v => v.userId)
    );
    return uniqueUsers.size;
  }, [allPageVisits]);

  const refreshSimulations = async () => {
    try {
      setNotification({ message: 'Atualizando dados...', type: 'success' });
      const snapshot = await getDocs(query(collection(db, 'simulations')));
      const sList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationResult));
      setAllSimulations(sList);
      setNotification({ message: 'Dados atualizados!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'simulations');
      setNotification({ message: 'Erro ao atualizar dados.', type: 'error' });
    }
  };

  const showSimulationCounts = () => {
    const counts: Record<string, number> = {};
    
    // Inicializa com 0 para todos os usuários
    allUsers.forEach(user => {
      counts[user.uid] = 0;
    });

    // Conta apenas simulados completos
    allSimulations.forEach(sim => {
      if (sim.isMiniSimulado !== true) {
        if (counts.hasOwnProperty(sim.userId)) {
          counts[sim.userId] += 1;
        }
      }
    });

    const list = Object.entries(counts).map(([userId, count]) => {
      const user = allUsers.find(u => u.uid === userId);
      return {
        name: user?.displayName || 'Desconhecido',
        email: user?.email || 'Sem e-mail',
        count
      };
    }).sort((a, b) => b.count - a.count);

    setConfirmModal({
      title: "Simulados Finalizados por Usuário",
      message: list.length > 0 ? (
        <div className="max-h-96 overflow-y-auto text-sm">
          {list.map((item, index) => (
            <div key={index} className="mb-2 p-2 border-b border-slate-100">
              <span className="font-bold">{index + 1}. {item.name}</span> 
              <span className="text-slate-500"> ({item.email})</span>: 
              <span className="font-bold text-indigo-600"> {item.count} simulados</span>
            </div>
          ))}
        </div>
      ) : "Nenhum usuário encontrado.",
      onConfirm: () => setConfirmModal(null)
    });
  };

  return (
    <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Voltar ao Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Visitantes (Hoje)" value={todayVisits} icon={<LayoutDashboard className="text-indigo-600" />} />
        <button 
            onClick={showSimulationCounts}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-300 transition-all cursor-pointer"
        >
            <div className="text-left">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Verificar Simulados</p>
                <p className="text-2xl font-bold text-slate-900">Por Usuário</p>
            </div>
            <BarChart3 className="text-indigo-600 w-8 h-8" />
        </button>
        <button 
            onClick={refreshSimulations}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-300 transition-all cursor-pointer"
        >
            <div className="text-left">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Atualizar</p>
                <p className="text-2xl font-bold text-slate-900">Dados</p>
            </div>
            <RefreshCw className="text-indigo-600 w-8 h-8" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { id: 'users', label: 'Usuários', icon: <Users className="w-6 h-6" />, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
          { id: 'questions', label: 'Questões', icon: <PlusCircle className="w-6 h-6" />, color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
          { id: 'errors', label: 'Erros', icon: <AlertTriangle className="w-6 h-6" />, color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
          { id: 'logs', label: 'Logs', icon: <LayoutDashboard className="w-6 h-6" />, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
          { id: 'mindmaps', label: 'Mapa Mental', icon: <BookOpen className="w-6 h-6" />, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
          { id: 'versions', label: 'Versão', icon: <FileText className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAdminView(item.id as any)}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 transition-all ${
              adminView === item.id 
                ? `${item.color.replace('hover:', '')} ring-2 ring-offset-2 ring-indigo-500` 
                : `${item.color} border-transparent`
            }`}
          >
            {item.icon}
            <span className="font-bold text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {adminView === 'users' && (
        <UsersPage allSimulations={allSimulations} allUsers={allUsers} setAllUsers={setAllUsers} />
      )}
      {adminView === 'questions' && (
        <AdminQuestions 
          profile={profile} 
          allSimulations={allSimulations}
          setNotification={setNotification} 
          setConfirmModal={setConfirmModal} 
          downloadPDF={downloadPDF} 
          onBack={() => setAdminView('users')} 
        />
      )}
      {adminView === 'errors' && (
        <ErrorReportPage 
          allErrors={allErrors} 
          setNotification={setNotification} 
          setConfirmModal={setConfirmModal} 
        />
      )}
      {adminView === 'logs' && (
        <SimulationLogsPage 
          allPageVisits={allPageVisits} 
          allUsers={allUsers} 
          allActiveSimulations={allActiveSimulations}
          setNotification={setNotification}
          setConfirmModal={setConfirmModal}
          onBack={() => setAdminView(null)} 
        />
      )}
      {adminView === 'mindmaps' && (
        <AdminMindMaps 
          setNotification={setNotification} 
          setConfirmModal={setConfirmModal} 
        />
      )}
      {adminView === 'versions' && (
        <VersionControl setNotification={setNotification} />
      )}

    </motion.div>
  );
};

export default AdminPage;
