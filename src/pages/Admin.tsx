import React from 'react';
import { motion } from 'motion/react';
import { Users, PlusCircle, AlertTriangle, ChevronLeft, LayoutDashboard, BookOpen } from 'lucide-react';
import UsersPage from './Users';
import AdminQuestions from './AdminQuestions';
import SimulationLogsPage from './SimulationLogs';
import AdminMindMaps from './AdminMindMaps';
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
  setConfirmModal: (modal: { title: string; message: string; onConfirm: () => void } | null) => void;
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
  const [adminView, setAdminView] = React.useState<'users' | 'questions' | 'errors' | 'logs' | 'mindmaps' | null>(null);

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

  return (
    <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Voltar ao Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Visitantes (Hoje)" value={todayVisits} icon={<LayoutDashboard className="text-indigo-600" />} />
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={() => setAdminView('users')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold ${adminView === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
          <Users className="w-5 h-5" /> Usuários
        </button>
        <button onClick={() => setAdminView('questions')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold ${adminView === 'questions' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
          <PlusCircle className="w-5 h-5" /> Questões
        </button>
        <button onClick={() => setAdminView('errors')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold ${adminView === 'errors' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
          <AlertTriangle className="w-5 h-5" /> Erros
        </button>
        <button onClick={() => setAdminView('logs')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold ${adminView === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
          <LayoutDashboard className="w-5 h-5" /> Logs
        </button>
        <button onClick={() => setAdminView('mindmaps')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold ${adminView === 'mindmaps' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
          <BookOpen className="w-5 h-5" /> Mapa Mental
        </button>
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
          onBack={() => setAdminView(null)} 
        />
      )}
      {adminView === 'mindmaps' && (
        <AdminMindMaps 
          setNotification={setNotification} 
          setConfirmModal={setConfirmModal} 
        />
      )}
    </motion.div>
  );
};

export default AdminPage;
