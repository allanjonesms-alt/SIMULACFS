import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  auth, db, googleProvider, 
  handleFirestoreError, OperationType, sendNotification, logPageVisit
} from './firebase';
import { 
  onAuthStateChanged, signInWithPopup, signOut, User 
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, onSnapshot, 
  query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  LogOut, 
  PlusCircle, 
  Trophy, 
  History, 
  Settings, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Play,
  X,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Trash2,
  Zap,
  Star,
  AlertTriangle,
  BarChart2,
  Search,
  Target,
  Database,
  MessageCircle,
  FileText,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, Question, SimulationResult, QuestionError, MindMap } from './types';
import DifficultyStars from './components/DifficultyStars';
import AdminPage from './pages/Admin';
import UpgradePage from './components/UpgradePage';
import StatCard from './components/StatCard';
import ScheduleCard from './components/ScheduleCard';
import { CutoffPoll } from './components/CutoffPoll';
import PerformancePage from './pages/Performance';
import ContatoPage from './pages/Contato';
import { RankingPage } from './components/RankingPage';
import { ErrorReportModal } from './components/ErrorReportModal';
import { ErrorReportPage } from './components/ErrorReportPage';
import { MiniSimuladoPage } from './pages/MiniSimulado';
import { HistoryPage } from './pages/HistoryPage';
import UsersPage from './pages/Users';
import AdminQuestions from './pages/AdminQuestions';
import { MindMapsPage } from './pages/MindMapsPage';
import Lei1102 from './pages/subjects/Lei1102';
import Lei053 from './pages/subjects/Lei053';
import Lei127 from './pages/subjects/Lei127';
import Decreto1093 from './pages/subjects/Decreto1093';
import RDPMMS from './pages/subjects/RDPMMS';
import LinguaPortuguesa from './pages/subjects/LinguaPortuguesa';
import ConselhoDisciplina from './pages/subjects/ConselhoDisciplina';
import SubjectPage from './components/SubjectPage';
import CD_DATA from './data/conselho_disciplina.json';

interface ShuffledOption {
  id: number;
  text: string;
}

interface ExamQuestion extends Question {
  shuffledOptions: ShuffledOption[];
}

interface ActiveSimulation {
  id: string;
  userId: string;
  questions: ExamQuestion[];
  currentIndex: number;
  answers: number[];
  updatedAt: any;
  elapsedTime: number;
}

import { ErrorBoundary } from './components/ErrorBoundary';
import { MaintenancePage } from './components/MaintenancePage';

// --- Main App ---

import { useQuestions } from './hooks/useQuestions';
import { useSimulation } from './hooks/useSimulation';
import { useMiniSimulado } from './hooks/useMiniSimulado';

export default function App() {
  const { questions } = useQuestions();
  const [isMaintenanceMode] = useState(false); // Set to true to show maintenance page
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'simulation' | 'history' | 'performance' | 'ranking' | 'admin' | 'upgrade' | 'mini_simulados' | 'conselho_disciplina' | 'contato' | 'instructions' | 'mind_maps'>('dashboard');
  const [pendingSimulationType, setPendingSimulationType] = useState<'full' | 'mini' | null>(null);
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
  
  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }
  
  // Data states
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allSimulations, setAllSimulations] = useState<SimulationResult[]>([]);
  const [allActiveSimulations, setAllActiveSimulations] = useState<any[]>([]);
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [allPageVisits, setAllPageVisits] = useState<any[]>([]);
  const [allErrors, setAllErrors] = useState<QuestionError[]>([]);
  
  // Computed Ranking
  const processedRanking = useMemo(() => {
    const simulationsForRanking = allSimulations.filter(sim => !sim.isMiniSimulado);
    if (!simulationsForRanking.length) return [];

    // Group by userId
    const userSims: Record<string, SimulationResult[]> = {};
    simulationsForRanking.forEach(sim => {
      if (!userSims[sim.userId]) userSims[sim.userId] = [];
      userSims[sim.userId].push(sim);
    });

    const rankingList = Object.values(userSims).map(sims => {
      // Sort by date ascending to track progress and find the best score
      const sortedByDateAsc = [...sims].sort((a, b) => {
        const dateA = a.date?.toMillis?.() || (a.date?.seconds ? a.date.seconds * 1000 : 0);
        const dateB = b.date?.toMillis?.() || (b.date?.seconds ? b.date.seconds * 1000 : 0);
        return dateA - dateB;
      });

      let currentBestScore = -1;
      let bestSim = sortedByDateAsc[0];
      let lastDiff = 0;

      sortedByDateAsc.forEach(sim => {
        // Only update if the score is strictly better than the current best
        if (sim.score > currentBestScore) {
          lastDiff = currentBestScore === -1 ? 0 : sim.score - currentBestScore;
          currentBestScore = sim.score;
          bestSim = sim;
        }
      });

      return {
        ...bestSim,
        diff: lastDiff
      };
    });

    // Final sort by score desc, then date desc
    return rankingList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dateA = a.date?.toMillis?.() || (a.date?.seconds ? a.date.seconds * 1000 : 0);
      const dateB = b.date?.toMillis?.() || (b.date?.seconds ? b.date.seconds * 1000 : 0);
      return dateB - dateA;
    }).slice(0, 50);
  }, [allSimulations]);

  const averages = useMemo(() => {
    const fullSims = history.filter(s => !s.isMiniSimulado);
    const miniSims = history.filter(s => s.isMiniSimulado);

    const fullAvg = fullSims.length > 0 
      ? fullSims.reduce((acc, s) => acc + (s.score / s.totalQuestions), 0) / fullSims.length 
      : 0;
    
    const miniAvg = miniSims.length > 0 
      ? miniSims.reduce((acc, s) => acc + (s.score / s.totalQuestions), 0) / miniSims.length 
      : 0;

    return {
      full: (fullAvg * 100).toFixed(1),
      mini: (miniAvg * 100).toFixed(1)
    };
  }, [history]);
  
  // Simulation state will be initialized after setNotification.

  // Simulation functions are now in useSimulation hook.

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const isAdminEmail = user.email === 'allanjonesms@gmail.com';
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          console.log("Perfil carregado:", data);
          // Auto-upgrade to admin and premium if email matches
          if (isAdminEmail && (data.role !== 'admin' || !data.isUpgraded)) {
            console.log("Atualizando perfil para admin/premium");
            const updates: Partial<UserProfile> = {};
            if (data.role !== 'admin') updates.role = 'admin';
            if (!data.isUpgraded) updates.isUpgraded = true;
            
            await updateDoc(doc(db, 'users', user.uid), updates);
            setProfile({ ...data, ...updates });
          } else {
            setProfile(data);
          }
        } else {
          console.log("Criando novo perfil para:", user.email);
          // Create new profile
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Usuário',
            photoURL: user.photoURL || '',
            role: isAdminEmail ? 'admin' : 'user',
            isActive: true,
            isUpgraded: isAdminEmail, // Admins should be upgraded by default
            anonymousName: `Estudante_${Math.floor(Math.random() * 10000)}`,
            phone: ''
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Timeout to force loading to false if Firebase hangs
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!user || !profile) return;

    // History listener (only own): Keep as onSnapshot for real-time history updates
    const hQuery = query(collection(db, 'simulations'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const hUnsubscribe = onSnapshot(hQuery, (snapshot) => {
      const hList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationResult));
      setHistory(hList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'simulations'));

    // All simulations: Load initially and refresh every 15 minutes
    const fetchAllSimulations = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'simulations')));
        const sList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationResult));
        setAllSimulations(sList);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'simulations');
      }
    };

    fetchAllSimulations();
    const simulationsInterval = setInterval(fetchAllSimulations, 15 * 60 * 1000);

    // Active simulation listener
    const activeUnsubscribe = onSnapshot(doc(db, 'active_simulations', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setActiveSimulation({ 
          id: snapshot.id, 
          ...data, 
          elapsedTime: data.elapsedTime || 0 
        } as ActiveSimulation);
      } else {
        setActiveSimulation(null);
      }
    }, (error) => {
      if (!error.message.toLowerCase().includes('permission') && !error.message.toLowerCase().includes('denied')) {
        handleFirestoreError(error, OperationType.GET, 'active_simulations');
      }
    });

    let activeSimsUnsubscribe: (() => void) | undefined;

    // Admin listeners
    if (profile.role === 'admin') {
      getDocs(collection(db, 'users')).then(snapshot => {
        const uList = snapshot.docs.map(doc => doc.data() as UserProfile);
        uList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setAllUsers(uList);
      }).catch(error => {
        console.error("Erro ao carregar usuários:", error);
        handleFirestoreError(error, OperationType.LIST, 'users');
      });

      getDocs(collection(db, 'question_errors')).then(snapshot => {
        const eList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionError));
        setAllErrors(eList);
      }).catch(error => handleFirestoreError(error, OperationType.LIST, 'question_errors'));

      getDocs(collection(db, 'page_visits')).then(snapshot => {
        const vList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllPageVisits(vList);
      }).catch(error => handleFirestoreError(error, OperationType.LIST, 'page_visits'));

      // Admin: Active simulations listener: Real-time
      const activeSimsQuery = collection(db, 'active_simulations');
      activeSimsUnsubscribe = onSnapshot(activeSimsQuery, (snapshot) => {
        const aList = snapshot.docs.map(doc => ({ id: doc.id, userId: doc.id, ...doc.data() }));
        setAllActiveSimulations(aList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'active_simulations'));
    }

    // Mind Maps listener (for tips)
    let mmUnsubscribe: (() => void) | undefined;
    if (profile.isUpgraded) {
      const mmQuery = query(collection(db, 'mind_maps'), orderBy('createdAt', 'desc'));
      mmUnsubscribe = onSnapshot(mmQuery, (snapshot) => {
        const mmList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MindMap));
        setMindMaps(mmList);
      }, (error) => {
        if (!error.message.toLowerCase().includes('permission') && !error.message.toLowerCase().includes('denied')) {
          handleFirestoreError(error, OperationType.LIST, 'mind_maps');
        }
      });
    }

    return () => {
      hUnsubscribe();
      activeUnsubscribe();
      if (mmUnsubscribe) mmUnsubscribe();
      if (activeSimsUnsubscribe) activeSimsUnsubscribe();
      clearInterval(simulationsInterval);
    };
  }, [user, profile]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const [isMiniSimulado, setIsMiniSimulado] = useState(false);
  const [activeMiniSimulations, setActiveMiniSimulations] = useState<ActiveSimulation[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isReportingError, setIsReportingError] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);

  // Simulation state
  const {
    currentExam,
    examIndex,
    answers,
    examFinished,
    showFeedback,
    hasRatedCurrentQuestion,
    pendingRating,
    selectedOptionId,
    activeSimulation,
    elapsedTime,
    isPaused,
    setElapsedTime,
    setIsPaused,
    startSimulation,
    resumeSimulation,
    submitAnswer,
    setPendingRating,
    nextQuestion,
    proceedToNext,
    showTip,
    setShowTip,
    setExamFinished,
    setActiveSimulation,
    setCurrentExam,
    setExamIndex,
    setAnswers,
    setShowFeedback,
    setSelectedOptionId,
    setHasRatedCurrentQuestion
  } = useSimulation(user, profile, questions, mindMaps, history, setNotification, setView);

  const [confirmModal, setConfirmModal] = useState<{title: string, message: React.ReactNode, onConfirm: () => void} | null>(null);

  const {
    startMiniSimulation,
  } = useMiniSimulado(
    profile,
    questions,
    isMiniSimulado,
    setIsMiniSimulado,
    activeMiniSimulations,
    setActiveMiniSimulations,
    setNotification,
    setView,
    setCurrentExam,
    setExamIndex,
    setAnswers,
    setElapsedTime,
    setExamFinished,
    setShowFeedback,
    setSelectedOptionId,
    setHasRatedCurrentQuestion,
    setPendingRating,
    setConfirmModal,
    user
  );

  // Pause/resume timer based on view
  useEffect(() => {
    setIsPaused(view !== 'simulation');
    if (view === 'dashboard' && user) {
      logPageVisit(user.uid, 'dashboard');
    }
  }, [view, setIsPaused, user]);

  const downloadPDF = (law: string) => {
    const doc = new jsPDF();
    const filteredQuestions = questions.filter(q => (q.law || 'Sem Lei') === law);

    doc.setFontSize(18);
    doc.text(`Banco de Questões - ${law}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Total de questões: ${filteredQuestions.length}`, 14, 30);

    const tableData = filteredQuestions.map((q, index) => [
      `${index + 1}`,
      q.text,
      q.options.filter(opt => opt && opt.trim() !== '').map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n'),
      `${String.fromCharCode(65 + q.options.filter((opt, i) => i <= q.correctOption && (opt && opt.trim() !== '' || i < q.correctOption)).length - 1)}`,
      q.justification || 'N/A'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Questão', 'Alternativas', 'Correta', 'Justificativa']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 70 },
        2: { cellWidth: 60 },
        3: { cellWidth: 12 },
        4: { cellWidth: 35 }
      }
    });

    doc.save(`questoes_${law.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const downloadPDFLetterE = () => {
    const doc = new jsPDF();
    const filteredQuestions = questions.filter(q => q.correctOption === 4);

    doc.setFontSize(18);
    doc.text(`Banco de Questões - Respostas E`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Total de questões: ${filteredQuestions.length}`, 14, 30);

    const tableData = filteredQuestions.map((q, index) => [
      `${index + 1}`,
      q.text,
      q.options.filter(opt => opt && opt.trim() !== '').map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n'),
      `${String.fromCharCode(65 + q.options.filter((opt, i) => i <= q.correctOption && (opt && opt.trim() !== '' || i < q.correctOption)).length - 1)}`,
      q.justification || 'N/A'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Questão', 'Alternativas', 'Correta', 'Justificativa']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 70 },
        2: { cellWidth: 60 },
        3: { cellWidth: 12 },
        4: { cellWidth: 35 }
      }
    });

    doc.save(`questoes_resposta_e.pdf`);
  };

  const executeRemoveOptionEFromAll = async () => {
    try {
      setNotification({ message: 'Processando questões, aguarde...', type: 'success' });
      let updatedCount = 0;

      for (const q of questions) {
        if (q.options && q.options.length > 4) {
          let newOptions = [...q.options];
          let newCorrectOption = q.correctOption;

          if (q.correctOption === 4) {
            // A resposta correta é a E. Movemos o texto da E para a posição da D.
            newOptions[3] = newOptions[4]; 
            newCorrectOption = 3; // A resposta correta passa a ser a D
          } else if (q.correctOption > 4) {
            // Fallback de segurança caso haja alguma anomalia
            newCorrectOption = 3;
          }

          // Corta o array para ter apenas 4 alternativas (A, B, C, D)
          newOptions = newOptions.slice(0, 4);

          await updateDoc(doc(db, 'questions', q.id), {
            options: newOptions,
            correctOption: newCorrectOption
          });
          updatedCount++;
        }
      }

      setNotification({ message: `${updatedCount} questões foram adaptadas para 4 alternativas!`, type: 'success' });
    } catch (error) {
      console.error(error);
      setNotification({ message: 'Erro ao atualizar as questões.', type: 'error' });
    }
  };

  const removeOptionEFromAll = () => {
    setConfirmModal({
      title: 'ATENÇÃO: Ação Irreversível!',
      message: 'Isso removerá a 5ª alternativa (Letra E) de TODAS as questões do banco.\n\nSe a resposta correta de uma questão for a Letra E, o texto dela será movido para a Letra D (e a antiga D será apagada), tornando a Letra D a nova resposta correta.\n\nDeseja continuar?',
      onConfirm: () => {
        setConfirmModal(null);
        executeRemoveOptionEFromAll();
      }
    });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Este domínio ainda não foi autorizado no Firebase. Tente abrir o aplicativo em uma nova aba ou verifique as configurações do console.");
      } else {
        setLoginError("Falha ao entrar com Google: " + (error.message || "Erro desconhecido"));
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const deleteUserSimulations = async (targetUserId: string) => {
    if (!profile || profile.role !== 'admin') {
      setNotification({ message: 'Ação não permitida.', type: 'error' });
      return;
    }

    try {
      const q = query(collection(db, 'simulations'), where('userId', '==', targetUserId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setNotification({ message: `Mini-simulados do usuário deletados com sucesso. (${querySnapshot.size} documentos)`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'simulations');
    }
  };

  // Simulation functions are now in useSimulation hook.

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SimuProvas</h1>
          <p className="text-slate-500 mb-8">Prepare-se para o sucesso com nossos simulados inteligentes.</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl text-left flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-2xl font-semibold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
          
          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Acesso Seguro & Rápido</p>
            <p className="text-[10px] text-slate-300 mt-2">Se o pop-up não abrir, tente abrir o app em uma nova aba.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleViewChange = (newView: typeof view) => {
    if (view === 'simulation' && isMiniSimulado && !examFinished) {
      setConfirmModal({
        title: 'Sair do Mini-Simulado?',
        message: 'Se você sair agora, todo o seu progresso no mini-simulado será perdido. Deseja continuar?',
        onConfirm: () => {
          // Reset all simulation states
          setExamFinished(false);
          setAnswers([]);
          setExamIndex(0);
          setElapsedTime(0);
          setShowFeedback(false);
          setSelectedOptionId(null);
          setHasRatedCurrentQuestion(false);
          setPendingRating(null);
          
          setIsMiniSimulado(false);
          setActiveMiniSimulations([]);
          setView(newView);
        }
      });
    } else {
      setView(newView);
    }
  };

  return (
    <ErrorBoundary>
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-white ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-600 mb-8">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Question Modal removed - now handled in AdminQuestions */}
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <img src="https://raw.githubusercontent.com/allanjonesms-alt/SIMULACFS/d4233b8baf105cbd5698056cac65c15b1a06c02b/logosimulacfs.png" alt="SimulaCFS Logo" className="h-16 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <img src={profile?.photoURL} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
            <button onClick={handleLogout} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Sidebar / Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-2 flex flex-row items-center overflow-x-auto gap-1 md:relative md:w-72 md:border-t-0 md:border-r md:p-6 md:flex-col md:items-stretch md:gap-2 md:overflow-visible md:z-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="hidden md:flex items-center gap-3 mb-10 px-2">
            <img src="https://raw.githubusercontent.com/allanjonesms-alt/SIMULACFS/d4233b8baf105cbd5698056cac65c15b1a06c02b/logosimulacfs.png" alt="SimulaCFS Logo" className="h-20 w-auto" />
          </div>

          <NavItem active={view === 'dashboard'} onClick={() => handleViewChange('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem 
            active={view === 'simulation' && !isMiniSimulado} 
            onClick={activeSimulation ? resumeSimulation : () => startSimulation(false)} 
            icon={<Play className="w-5 h-5" />} 
            label="Simulado Completo" 
          />
          <NavItem active={view === 'mini_simulados'} onClick={() => handleViewChange('mini_simulados')} icon={<Target />} label="Mini-Simulados" />
          <NavItem active={view === 'history'} onClick={() => handleViewChange('history')} icon={<History />} label="Histórico" />
          <NavItem active={view === 'performance'} onClick={() => handleViewChange('performance')} icon={<BarChart2 />} label="Desempenho" />
          <NavItem active={view === 'ranking'} onClick={() => handleViewChange('ranking')} icon={<Trophy />} label="Ranking" />
          {profile?.isUpgraded && (
            <NavItem active={view === 'mind_maps'} onClick={() => handleViewChange('mind_maps')} icon={<BookOpen />} label="Mapas Mentais" />
          )}
          <NavItem active={view === 'contato'} onClick={() => handleViewChange('contato')} icon={<MessageCircle />} label="Contato" />
          {!profile?.isUpgraded && (
            <NavItem active={view === 'upgrade'} onClick={() => handleViewChange('upgrade')} icon={<Zap />} label="Upgrade" />
          )}
          
          {(profile?.role === 'admin' || user?.email === 'allanjonesms@gmail.com') && (
            <NavItem active={view === 'admin'} onClick={() => handleViewChange('admin')} icon={<ShieldCheck />} label="Admin" />
          )}

          <div className="hidden md:block mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-slate-50 rounded-2xl">
              <img src={profile?.photoURL} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{profile?.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10">
          <AnimatePresence mode="wait">
            {view === 'instructions' && (
              <motion.div key="instructions" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-2xl mx-auto">
                <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 text-center">
                  <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <BookOpen className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Instruções do Simulado</h2>
                  
                  <div className="space-y-6 text-left mb-10">
                    <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <Zap className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                      <div>
                        <p className="text-amber-900 font-bold mb-1">Aviso Importante:</p>
                        <p className="text-amber-800 text-sm leading-relaxed">
                          As questões atualmente estão sendo classificadas em dificuldade e as questões de muita facilidade serão excluídas para aumentar o nível do aprendizado.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                      <div>
                        <p className="text-slate-900 font-bold mb-2">Formato do Simulado:</p>
                        <div className="text-slate-600 text-sm leading-relaxed space-y-3">
                          {pendingSimulationType === 'full' ? (
                            <>
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <span><strong>50 Questões:</strong> 20 de português e 30 de Legislação Específica.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <span><strong>Conteúdo:</strong> Segue o conteúdo programático contido no edital.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <span><strong>Cronometrado:</strong> Organize-se quanto ao tempo gasto.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MessageCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <span><strong>Feedback:</strong> Deixe sua opinião sobre a dificuldade ao responder.</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-start gap-2">
                              <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span>{`O mini-simulado de ${pendingSubject} contém 10 questões focadas e rápidas.`}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        setView(pendingSimulationType === 'mini' ? 'mini_simulados' : 'dashboard');
                        setPendingSimulationType(null);
                        setPendingSubject(null);
                      }}
                      className="flex-1 px-8 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={() => {
                        if (pendingSimulationType === 'full') {
                          startSimulation(false);
                        } else if (pendingSimulationType === 'mini' && pendingSubject) {
                          startMiniSimulation(pendingSubject);
                        }
                        setPendingSimulationType(null);
                        setPendingSubject(null);
                      }}
                      className="flex-1 px-8 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      Começar Agora
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            {view === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Olá, {profile?.displayName}! 👋</h2>
                    <p className="text-slate-500">Bem-vindo de volta ao seu painel de estudos.</p>
                  </div>
                  <button 
                    onClick={activeSimulation ? resumeSimulation : () => {
                      setPendingSimulationType('full');
                      setView('instructions');
                    }}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {activeSimulation ? 'Continuar Simulado' : 'Iniciar Simulado'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  <StatCard 
                    label="Simulados" 
                    value={history.filter(s => !s.isMiniSimulado).length} 
                    subValue={allSimulations.filter(s => !s.isMiniSimulado).length}
                    subLabel="Seus / Total Geral"
                    icon={<History className="text-indigo-600" />} 
                  />
                  <StatCard 
                    label="Média de Acertos" 
                    value={history.filter(s => !s.isMiniSimulado).length > 0 ? `${(history.filter(s => !s.isMiniSimulado).reduce((a, b) => a + b.score, 0) / history.filter(s => !s.isMiniSimulado).length).toFixed(1)}` : '0'} 
                    subValue={allSimulations.filter(s => !s.isMiniSimulado).length > 0 ? `${(allSimulations.filter(s => !s.isMiniSimulado).reduce((a, b) => a + b.score, 0) / allSimulations.filter(s => !s.isMiniSimulado).length).toFixed(1)}` : '0'}
                    subLabel="Sua / Geral"
                    icon={<CheckCircle2 className="text-emerald-600" />} 
                  />
                  <ScheduleCard />
                  <StatCard 
                    label="Status da Conta" 
                    value={profile?.isUpgraded ? 'Premium' : 'Gratuito'} 
                    icon={<ShieldCheck className="text-indigo-600" />} 
                  />
                </div>

                {!profile?.isUpgraded && (
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl mb-10 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-2">Desbloqueie todo o seu potencial!</h3>
                      <p className="text-indigo-100 mb-6 max-w-md">Faça o upgrade para o plano Premium e tenha acesso ilimitado a simulados, ranking completo e estatísticas detalhadas.</p>
                      <button 
                        onClick={() => handleViewChange('upgrade')}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                      >
                        Fazer Upgrade Agora
                      </button>
                    </div>
                    <Trophy className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
                  </div>
                )}

                <CutoffPoll userId={user.uid} />

                <h3 className="text-xl font-bold text-slate-900 mb-6">Últimas Atividades</h3>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  {history.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Acertos</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Desempenho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.slice(0, 5).map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {h.date?.toDate ? h.date.toDate().toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {h.score} / {h.totalQuestions}
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full" 
                                  style={{ width: `${(h.score / h.totalQuestions) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-10 text-center text-slate-400">
                      Nenhum mini-simulado realizado ainda.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {view === 'upgrade' && (
              <motion.div key="upgrade" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <UpgradePage onBack={() => setView('dashboard')} userId={user.uid} email={user.email || ''} displayName={profile?.displayName || 'Usuário'} />
              </motion.div>
            )}

            {view === 'performance' && (
              <motion.div key="performance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PerformancePage 
                  history={history} 
                  allSimulations={allSimulations} 
                  allUsers={allUsers}
                  profile={profile} 
                  onUpgrade={() => handleViewChange('upgrade')} 
                />
              </motion.div>
            )}

            {view === 'mini_simulados' && (
              <MiniSimuladoPage 
                profile={profile} 
                questions={questions} 
                isMiniSimulado={isMiniSimulado}
                setIsMiniSimulado={setIsMiniSimulado}
                activeMiniSimulations={activeMiniSimulations}
                setActiveMiniSimulations={setActiveMiniSimulations}
                setNotification={setNotification}
                setView={setView}
                setCurrentExam={setCurrentExam}
                setExamIndex={setExamIndex}
                setAnswers={setAnswers}
                setElapsedTime={setElapsedTime}
                setExamFinished={setExamFinished}
                setShowFeedback={setShowFeedback}
                setSelectedOptionId={setSelectedOptionId}
                setHasRatedCurrentQuestion={setHasRatedCurrentQuestion}
                setPendingRating={setPendingRating}
                setConfirmModal={setConfirmModal}
                user={user}
                setPendingSimulationType={setPendingSimulationType}
                setPendingSubject={setPendingSubject}
                pendingSimulationType={pendingSimulationType}
                pendingSubject={pendingSubject}
                startMiniSimulation={startMiniSimulation}
              />
            )}

            {view === 'simulation' && (
              <motion.div key="simulation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto">
                {!examFinished ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div className="flex flex-col">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Simulado em Andamento</h2>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="bg-emerald-100 text-emerald-600 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-black text-base sm:text-lg">
                            {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{ (elapsedTime % 60).toString().padStart(2, '0')}
                          </div>
                          <span className="bg-indigo-100 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1">
                            Questão <span className="text-2xl sm:text-4xl font-black">{examIndex + 1}</span>/{currentExam.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                title: isMiniSimulado ? 'Cancelar Mini-Simulado' : 'Cancelar Simulado',
                                message: isMiniSimulado ? 'Tem certeza que deseja cancelar o mini-simulado atual? Todo o progresso será perdido.' : 'Tem certeza que deseja cancelar o simulado atual? Todo o progresso será perdido.',
                                onConfirm: async () => {
                                  try {
                                    if (user && !isMiniSimulado) {
                                      await deleteDoc(doc(db, 'active_simulations', user.uid));
                                    } else if (isMiniSimulado) {
                                      setActiveMiniSimulations([]);
                                    }
                                    setExamFinished(true);
                                    setAnswers([]);
                                    setExamIndex(0);
                                    setElapsedTime(0);
                                    setIsMiniSimulado(false);
                                    setView('dashboard');
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, 'active_simulations');
                                  }
                                }
                              });
                            }}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-600 text-xs sm:text-sm font-bold transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            {isMiniSimulado ? 'Cancelar Mini' : 'Cancelar Simulado'}
                          </button>
                          <button 
                            onClick={() => {
                              setReportingQuestion(currentExam[examIndex]);
                              setIsReportingError(true);
                            }}
                            className="flex items-center gap-2 text-red-500 hover:text-red-600 text-xs sm:text-sm font-bold transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Erro
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 mb-6">
                      {currentExam[examIndex]?.law && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg uppercase tracking-wider border border-indigo-100">
                            {currentExam[examIndex].law}
                          </div>
                          <DifficultyStars difficulty={currentExam[examIndex].difficulty || 0} size="md" />
                        </div>
                      )}
                      <div className="text-xl text-slate-800 font-medium leading-relaxed mb-8 markdown-body" translate="no">
                        <div dangerouslySetInnerHTML={{ __html: currentExam[examIndex]?.text }} />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {currentExam[examIndex]?.shuffledOptions?.filter(o => o.text && o.text.trim() !== '').map((option, idx) => {
                          const isSelected = selectedOptionId === option.id;
                          const isCorrect = option.id === currentExam[examIndex].correctOption;
                          
                          let buttonClass = "border-slate-100 hover:border-indigo-600 hover:bg-indigo-50";
                          let iconClass = "bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white";

                          if (showFeedback) {
                            if (isCorrect) {
                              buttonClass = "border-emerald-500 bg-emerald-50";
                              iconClass = "bg-emerald-500 text-white";
                            } else if (isSelected) {
                              buttonClass = "border-red-500 bg-red-50";
                              iconClass = "bg-red-500 text-white";
                            } else {
                              buttonClass = "border-slate-100 opacity-50";
                            }
                          }

                          return (
                            <button 
                              key={option.id}
                              onClick={() => submitAnswer(option.id)}
                              disabled={showFeedback}
                              className={`flex items-center gap-4 p-2 text-left border-2 rounded-2xl transition-all group ${buttonClass}`}
                            >
                              <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${iconClass}`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="flex-1 text-slate-700 font-medium markdown-body" translate="no">
                                <div dangerouslySetInnerHTML={{ __html: option.text }} />
                              </span>
                              {showFeedback && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                              {showFeedback && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500" />}
                            </button>
                          );
                        })}
                      </div>

                      {showFeedback && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {selectedOptionId === currentExam[examIndex].correctOption ? (
                              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <CheckCircle2 className="w-5 h-5" />
                                Resposta Correta!
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-red-600 font-bold">
                                  <XCircle className="w-5 h-5" />
                                  Resposta Incorreta
                                </div>
                                <div className="text-slate-600 text-sm font-medium ml-7">
                                  A resposta correta é a alternativa <span className="font-bold text-emerald-600">
                                    {String.fromCharCode(65 + currentExam[examIndex].shuffledOptions.filter(o => o.text && o.text.trim() !== '').findIndex(o => o.id === currentExam[examIndex].correctOption))}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {currentExam[examIndex].justification && (
                            <div className="text-slate-600 text-sm leading-relaxed" translate="no">
                              <span className="font-bold block mb-1">Justificativa:</span>
                              {(() => {
                                const correctOptionLetter = String.fromCharCode(65 + currentExam[examIndex].shuffledOptions.filter(o => o.text && o.text.trim() !== '').findIndex(o => o.id === currentExam[examIndex].correctOption));
                                return currentExam[examIndex].justification.replace(/A alternativa [A-E] é a correta/gi, `A alternativa ${correctOptionLetter} é a correta`);
                              })()}
                            </div>
                          )}

                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <p className="text-sm font-medium text-slate-600 mb-3">Avalie a dificuldade desta questão (opcional):</p>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  onClick={() => setPendingRating(rating)}
                                  className="p-1 rounded-lg transition-all hover:bg-amber-50 hover:scale-110 active:scale-95"
                                  title={`${rating} estrela${rating > 1 ? 's' : ''}`}
                                >
                                  <Star 
                                    className={`w-6 h-6 ${
                                      (pendingRating !== null && rating <= pendingRating)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-300 hover:text-amber-400'
                                    }`} 
                                  />
                                </button>
                              ))}
                              {pendingRating !== null && (
                                <span className="text-xs font-medium text-amber-600 ml-2">Selecionado: {pendingRating} {pendingRating === 1 ? 'estrela' : 'estrelas'}</span>
                              )}
                            </div>
                          </div>

                          <button 
                            onClick={() => nextQuestion(isMiniSimulado)}
                            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                          >
                            {examIndex < currentExam.length - 1 ? 'Próxima Questão' : 'Ver Resultado Final'}
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}

                      <AnimatePresence>
                        {showTip && (
                          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                            >
                              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold text-indigo-900">Dica de Estudo</h3>
                                    <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Baseado nos Mapas Mentais</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-none w-full">
                                {mindMaps.length > 0 ? (
                                  (() => {
                                    // Use a stable random index based on current question to avoid flickering
                                    const randomIndex = (examIndex + answers.length) % mindMaps.length;
                                    const tip = mindMaps[randomIndex];
                                    return (
                                      <div className="w-full">
                                        <h4 className="text-indigo-600 font-bold mb-4 text-sm md:text-xl">{tip.subject}</h4>
                                        <div className="text-slate-700 leading-relaxed text-[10px] md:text-base break-words whitespace-normal prose prose-sm md:prose-indigo max-w-none w-full">
                                          <div dangerouslySetInnerHTML={{ __html: tip.content }} />
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <p className="text-slate-500 italic text-center py-10">Prepare-se para o sucesso! Continue focado nos seus estudos.</p>
                                )}
                              </div>
                              <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <button 
                                  onClick={() => proceedToNext(answers, isMiniSimulado)}
                                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                >
                                  Próxima
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="text-center bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 relative">
                    <button 
                      onClick={() => {
                        setIsMiniSimulado(false);
                        setExamFinished(false);
                        setView('dashboard');
                      }}
                      className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                      title="Fechar"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Simulado Concluído!</h2>
                    <p className="text-slate-500 mb-8">Parabéns pelo seu esforço. Veja seu resultado abaixo:</p>
                    
                    <div className="text-6xl font-black text-indigo-600 mb-4">
                      {answers.filter((a, i) => a === currentExam[i].correctOption).length} / {currentExam.length}
                    </div>
                    <p className="text-lg font-bold text-slate-700 mb-8">Questões Corretas</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Média Simulados</p>
                        <p className="text-3xl font-black text-indigo-600">{averages.full}%</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Média Mini-Simulados</p>
                        <p className="text-3xl font-black text-amber-600">{averages.mini}%</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsMiniSimulado(false);
                        setExamFinished(false);
                        setView('dashboard');
                      }}
                      className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg w-full md:w-auto"
                    >
                      Voltar ao Dashboard
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'history' && (
              <HistoryPage history={history} />
            )}

            {view === 'ranking' && (
              <RankingPage 
                processedRanking={processedRanking} 
                profile={profile} 
                user={user} 
                onUpgradeClick={() => handleViewChange('upgrade')} 
              />
            )}

            {view === 'mind_maps' && (
              <MindMapsPage profile={profile} onUpgrade={() => handleViewChange('upgrade')} />
            )}

            {view === 'contato' && (
              <ContatoPage />
            )}

            {view === 'conselho_disciplina' && (
              <motion.div key="conselho_disciplina" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ConselhoDisciplina 
                  questions={questions.filter(q => q.law === 'Conselho de Disciplina')}
                  onBack={() => setView('dashboard')}
                  onDownloadPDF={downloadPDF}
                  isAdmin={false}
                />
              </motion.div>
            )}
            {view === 'admin' && (profile?.role === 'admin' || user?.email === 'allanjonesms@gmail.com') && (
              <AdminPage 
                user={user}
                profile={profile}
                allSimulations={allSimulations}
                allUsers={allUsers}
                setAllUsers={setAllUsers}
                allErrors={allErrors}
                setAllErrors={setAllErrors}
                setAllSimulations={setAllSimulations}
                allPageVisits={allPageVisits}
                allActiveSimulations={allActiveSimulations}
                setNotification={setNotification}
                setConfirmModal={setConfirmModal}
                downloadPDF={downloadPDF}
                onBack={() => setView('dashboard')}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
      {/* Report Error Modal */}
      <ErrorReportModal 
        isOpen={isReportingError}
        onClose={() => {
          setIsReportingError(false);
          setReportingQuestion(null);
        }}
        question={reportingQuestion}
        user={user}
        setConfirmModal={setConfirmModal}
      />
    </ErrorBoundary>
  );
}

// --- Helper Components ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-2 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-bold transition-all shrink-0 min-w-[72px] md:min-w-0 ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className="w-5 h-5 md:w-5 md:h-5">
        {icon}
      </span>
      <span className="text-[10px] md:text-base whitespace-nowrap">{label}</span>
    </button>
  );
}

