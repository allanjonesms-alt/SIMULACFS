import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  auth, db, googleProvider, 
  handleFirestoreError, OperationType, sendNotification 
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
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, Question, SimulationResult, QuestionError } from './types';
import UpgradePage from './components/UpgradePage';
import PerformancePage from './pages/Performance';
import AdminQuestions from './pages/AdminQuestions';
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

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.startsWith('{')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    const info = JSON.parse(errorInfo || '{}');
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erro de Permissão</h2>
          <p className="text-gray-600 mb-6">
            Ocorreu um erro ao acessar os dados. Isso pode ser devido a permissões insuficientes ou conta inativa.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-6 overflow-auto max-h-40 text-xs font-mono">
            {JSON.stringify(info, null, 2)}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Recarregar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const SergeantIcon = () => (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 80 L50 60 L90 80" stroke="#FFD700" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 60 L50 40 L90 60" stroke="#FFD700" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 40 L50 20 L90 40" stroke="#FFD700" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'simulation' | 'history' | 'performance' | 'ranking' | 'admin_users' | 'admin_questions' | 'admin_errors' | 'upgrade' | 'mini_simulados' | 'conselho_disciplina'>('dashboard');
  
  // Data states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allSimulations, setAllSimulations] = useState<SimulationResult[]>([]);
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
  
  // Simulation state
  const [currentExam, setCurrentExam] = useState<ExamQuestion[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // Stores the ID of the selected option
  const [examFinished, setExamFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasRatedCurrentQuestion, setHasRatedCurrentQuestion] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null);
  const [activeMiniSimulation, setActiveMiniSimulation] = useState<{
    subject: string;
    questions: ExamQuestion[];
    currentIndex: number;
    answers: number[];
    elapsedTime: number;
  } | null>(null);
  const [isMiniSimulado, setIsMiniSimulado] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSaveSimulation = useCallback((userId: string, data: any) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'active_simulations', userId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'active_simulations');
      }
    }, 3000); // Wait 3 seconds of inactivity before saving
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Error reporting state
  const [isReportingError, setIsReportingError] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);

  const existingLaws = useMemo(() => {
    const laws = questions.map(q => q.law).filter(Boolean) as string[];
    return Array.from(new Set(laws)).sort();
  }, [questions]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'simulation' && !examFinished && !isPaused) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, examFinished, isPaused]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
            anonymousName: `Estudante_${Math.floor(Math.random() * 10000)}`
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!user || !profile) return;

    // Questions listener
    const qUnsubscribe = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const qList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(qList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'questions'));

    // History listener (only own)
    const hQuery = query(collection(db, 'simulations'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const hUnsubscribe = onSnapshot(hQuery, (snapshot) => {
      const hList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationResult));
      setHistory(hList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'simulations'));

    // All simulations listener (for performance averages)
    const sUnsubscribe = onSnapshot(collection(db, 'simulations'), (snapshot) => {
      const sList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationResult));
      setAllSimulations(sList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'simulations'));

    // Admin: Users listener
    if (profile.role === 'admin') {
      const uUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const uList = snapshot.docs.map(doc => doc.data() as UserProfile);
        uList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setAllUsers(uList);
      }, (error) => {
        console.error("Erro ao carregar usuários:", error);
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      
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
        // Ignore permission denied if not exists yet
        if (!error.message.includes('permission-denied')) {
          handleFirestoreError(error, OperationType.GET, 'active_simulations');
        }
      });

      // Admin: Question errors listener
      const eUnsubscribe = onSnapshot(collection(db, 'question_errors'), (snapshot) => {
        const eList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionError));
        setAllErrors(eList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'question_errors'));

      return () => {
        qUnsubscribe();
        hUnsubscribe();
        sUnsubscribe();
        uUnsubscribe();
        activeUnsubscribe();
        eUnsubscribe();
      };
    }

    // Active simulation listener for non-admin
    const activeUnsubscribe = onSnapshot(doc(db, 'active_simulations', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setActiveSimulation({ id: snapshot.id, ...snapshot.data() } as ActiveSimulation);
      } else {
        setActiveSimulation(null);
      }
    }, (error) => {
      if (!error.message.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.GET, 'active_simulations');
      }
    });

    return () => {
      qUnsubscribe();
      hUnsubscribe();
      sUnsubscribe();
      activeUnsubscribe();
    };
  }, [user, profile]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

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
      q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n'),
      `${String.fromCharCode(65 + q.correctOption)}`,
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
      q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n'),
      `${String.fromCharCode(65 + q.correctOption)}`,
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

  const handleReportError = async () => {
    if (!user || !reportingQuestion || !errorDescription.trim()) return;

    try {
      await addDoc(collection(db, 'question_errors'), {
        questionId: reportingQuestion.id,
        questionText: reportingQuestion.text,
        userEmail: user.email || 'Anônimo',
        userId: user.uid,
        description: errorDescription.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setIsReportingError(false);
      setErrorDescription('');
      setReportingQuestion(null);
      
      setConfirmModal({
        title: "Obrigado!",
        message: "Sua correção foi enviada com sucesso. Iremos analisar a questão para melhorar nossos serviços.",
        onConfirm: () => setConfirmModal(null)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'question_errors');
    }
  };

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

  const startSimulation = async () => {
    if (activeSimulation) {
      setNotification({ message: 'Você já tem um simulado em andamento. Por favor, retome-o.', type: 'error' });
      return;
    }
    
    if (!profile?.isActive) {
      setNotification({ message: 'Sua conta está desativada. Entre em contato com o administrador.', type: 'error' });
      return;
    }
    
    // Check if user can take more simulations
    if (!profile.isUpgraded && history.length >= 1) {
      setNotification({ message: 'Você já realizou seu simulado gratuito. Faça o upgrade!', type: 'error' });
      return;
    }

    // Separate questions by category
    const portugueseQuestions = questions.filter(q => q.law === 'Língua Portuguesa');
    const otherQuestions = questions.filter(q => q.law !== 'Língua Portuguesa');

    if (portugueseQuestions.length === 0 && otherQuestions.length === 0) {
      setNotification({ message: 'Nenhuma questão disponível no momento.', type: 'error' });
      return;
    }

    // Pick 20 from Portuguese and 30 from others
    const selectedPortuguese = [...portugueseQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);
      
    const selectedOthers = [...otherQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 30);

    const combinedQuestions = [...selectedPortuguese, ...selectedOthers];

    const selectedQuestions = combinedQuestions.map(q => {
      return {
        ...q,
        shuffledOptions: q.options.map((text, index) => ({ id: index, text }))
      };
    });

    try {
      // Save active simulation state
      await setDoc(doc(db, 'active_simulations', user!.uid), {
        userId: user!.uid,
        questions: selectedQuestions,
        currentIndex: 0,
        answers: [],
        updatedAt: serverTimestamp(),
        elapsedTime: 0
      });

      setIsMiniSimulado(false);
      setCurrentExam(selectedQuestions);
      setExamIndex(0);
      setAnswers([]);
      setElapsedTime(0);
      setExamFinished(false);
      setShowFeedback(false);
      setSelectedOptionId(null);
      setHasRatedCurrentQuestion(false);
      setPendingRating(null);
      setView('simulation');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'active_simulations');
    }
  };

  const startMiniSimulation = async (subject: string) => {
    if (!profile?.isActive) {
      setNotification({ message: 'Sua conta está desativada. Entre em contato com o administrador.', type: 'error' });
      return;
    }
    
    if (!profile.isUpgraded) {
      setNotification({ message: 'Mini-simulados são exclusivos para usuários Premium. Faça o upgrade!', type: 'error' });
      return;
    }

    if (activeMiniSimulation?.subject === subject) {
      setIsMiniSimulado(true);
      setCurrentExam(activeMiniSimulation.questions);
      setExamIndex(activeMiniSimulation.currentIndex);
      setAnswers(activeMiniSimulation.answers);
      setElapsedTime(activeMiniSimulation.elapsedTime);
      setExamFinished(false);
      setShowFeedback(false);
      setSelectedOptionId(null);
      setHasRatedCurrentQuestion(false);
      setPendingRating(null);
      setView('simulation');
      return;
    }

    if (activeMiniSimulation && activeMiniSimulation.subject !== subject) {
      setConfirmModal({
        title: 'Novo Mini-Simulado',
        message: `Você já tem um mini-simulado de "${activeMiniSimulation.subject}" em andamento. Deseja iniciar um novo de "${subject}" e perder o progresso atual?`,
        onConfirm: () => {
          startNewMiniSimulation(subject);
        }
      });
      return;
    }

    startNewMiniSimulation(subject);
  };

  const startNewMiniSimulation = (subject: string) => {
    const subjectQuestions = questions.filter(q => (q.law || q.category || 'Sem Matéria') === subject);

    if (subjectQuestions.length === 0) {
      setNotification({ message: 'Nenhuma questão disponível para esta matéria.', type: 'error' });
      return;
    }

    const selectedQuestions = [...subjectQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 10)
      .map(q => {
        return {
          ...q,
          shuffledOptions: q.options.map((text, index) => ({ id: index, text }))
        };
      });

    const newMiniSim = {
      subject,
      questions: selectedQuestions,
      currentIndex: 0,
      answers: [],
      elapsedTime: 0
    };

    setActiveMiniSimulation(newMiniSim);
    setIsMiniSimulado(true);
    setCurrentExam(selectedQuestions);
    setExamIndex(0);
    setAnswers([]);
    setElapsedTime(0);
    setHasRatedCurrentQuestion(false);
    setPendingRating(null);
    setExamFinished(false);
    setShowFeedback(false);
    setSelectedOptionId(null);
    setView('simulation');
  };

  const resumeSimulation = () => {
    if (!activeSimulation) return;
    setIsMiniSimulado(false);
    setCurrentExam(activeSimulation.questions);
    setExamIndex(activeSimulation.currentIndex);
    setAnswers(activeSimulation.answers);
    setElapsedTime(activeSimulation.elapsedTime || 0);
    setExamFinished(false);
    setShowFeedback(false);
    setSelectedOptionId(null);
    setHasRatedCurrentQuestion(false);
    setPendingRating(null);
    setView('simulation');
  };

  const submitAnswer = (optionId: number) => {
    if (showFeedback) return;
    setSelectedOptionId(optionId);
    setShowFeedback(true);
  };

  const rateQuestion = async (questionId: string, rating: number) => {
    if (hasRatedCurrentQuestion) return;
    setHasRatedCurrentQuestion(true);
    try {
      const qRef = doc(db, 'questions', questionId);
      const qDoc = await getDoc(qRef);
      if (qDoc.exists()) {
        const data = qDoc.data() as Question;
        const newTotalRatings = (data.totalRatings || 0) + 1;
        const newSumOfRatings = (data.sumOfRatings || 0) + rating;
        const newDifficulty = Math.round(newSumOfRatings / newTotalRatings);
        
        await updateDoc(qRef, {
          totalRatings: newTotalRatings,
          sumOfRatings: newSumOfRatings,
          difficulty: newDifficulty
        });
        setNotification({ message: 'Obrigado pela sua avaliação!', type: 'success' });
      }
    } catch (error) {
      console.error('Erro ao avaliar questão:', error);
      setNotification({ message: 'Erro ao enviar avaliação', type: 'error' });
    }
  };

  const nextQuestion = async () => {
    if (pendingRating !== null) {
      await rateQuestion(currentExam[examIndex].id, pendingRating);
    }

    const newAnswers = [...answers, selectedOptionId!];
    setAnswers(newAnswers);
    setShowFeedback(false);
    setSelectedOptionId(null);
    setHasRatedCurrentQuestion(false);
    setPendingRating(null);
    
    if (examIndex < currentExam.length - 1) {
      const nextIdx = examIndex + 1;
      setExamIndex(nextIdx);
      
      if (!isMiniSimulado) {
        // Update active simulation state
        debouncedSaveSimulation(user!.uid, {
          currentIndex: nextIdx,
          answers: newAnswers,
          elapsedTime: elapsedTime || 0
        });
      } else {
        setActiveMiniSimulation(prev => prev ? {
          ...prev,
          currentIndex: nextIdx,
          answers: newAnswers,
          elapsedTime: elapsedTime || 0
        } : null);
      }
    } else {
      finishExam(newAnswers);
    }
  };

  const finishExam = async (finalAnswers: number[]) => {
    let score = 0;
    const subjectScores: Record<string, { correct: number; total: number }> = {};

    currentExam.forEach((q, idx) => {
      const isCorrect = q.correctOption === finalAnswers[idx];
      if (isCorrect) {
        score++;
      }

      const subject = q.law || q.category || 'Outros';
      if (!subjectScores[subject]) {
        subjectScores[subject] = { correct: 0, total: 0 };
      }
      subjectScores[subject].total++;
      if (isCorrect) {
        subjectScores[subject].correct++;
      }
    });

    const result: Omit<SimulationResult, 'id'> = {
      userId: user!.uid,
      score,
      totalQuestions: currentExam.length,
      date: serverTimestamp(),
      anonymousName: profile!.anonymousName,
      elapsedTime: elapsedTime || 0,
      subjectScores,
      isMiniSimulado: isMiniSimulado || false
    };

    try {
      await addDoc(collection(db, 'simulations'), result);
      
      if (!isMiniSimulado) {
        // Delete active simulation state
        await deleteDoc(doc(db, 'active_simulations', user!.uid));
      } else {
        setActiveMiniSimulation(null);
      }
      
      setExamFinished(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'simulations');
    }
  };

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
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <SergeantIcon />
            </div>
            <span className="text-lg font-bold text-slate-900">SimulaCFS</span>
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
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <SergeantIcon />
            </div>
            <span className="text-xl font-bold text-slate-900">SimulaCFS</span>
          </div>

          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem 
            active={view === 'simulation' && !isMiniSimulado} 
            onClick={activeSimulation ? resumeSimulation : startSimulation} 
            icon={<Play className="w-5 h-5" />} 
            label="Simulado Completo" 
          />
          <NavItem active={view === 'mini_simulados'} onClick={() => setView('mini_simulados')} icon={<Target />} label="Mini-Simulados" />
          <NavItem active={view === 'history'} onClick={() => setView('history')} icon={<History />} label="Histórico" />
          <NavItem active={view === 'performance'} onClick={() => setView('performance')} icon={<BarChart2 />} label="Desempenho" />
          <NavItem active={view === 'ranking'} onClick={() => setView('ranking')} icon={<Trophy />} label="Ranking" />
          {!profile?.isUpgraded && (
            <NavItem active={view === 'upgrade'} onClick={() => setView('upgrade')} icon={<Zap />} label="Upgrade" />
          )}
          
          {(profile?.role === 'admin' || user?.email === 'allanjonesms@gmail.com') && (
            <>
              <div className="hidden md:block mt-8 mb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Admin</div>
              <div className="md:hidden w-px h-8 bg-slate-200 mx-1 self-center shrink-0"></div>
              <NavItem active={view === 'admin_users'} onClick={() => setView('admin_users')} icon={<Users />} label="Usuários" />
              <NavItem active={view === 'admin_questions'} onClick={() => setView('admin_questions')} icon={<PlusCircle />} label="Questões" />
              <NavItem active={view === 'admin_errors'} onClick={() => setView('admin_errors')} icon={<AlertTriangle />} label="Erros" />
            </>
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
            {view === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Olá, {profile?.displayName}! 👋</h2>
                    <p className="text-slate-500">Bem-vindo de volta ao seu painel de estudos.</p>
                  </div>
                  <button 
                    onClick={activeSimulation ? resumeSimulation : startSimulation}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {activeSimulation ? 'Continuar Simulado' : 'Iniciar Simulado'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <StatCard label="Simulados Realizados" value={history.filter(s => !s.isMiniSimulado).length} icon={<History className="text-indigo-600" />} />
                  <StatCard label="Média de Acertos" value={history.filter(s => !s.isMiniSimulado).length > 0 ? `${(history.filter(s => !s.isMiniSimulado).reduce((a, b) => a + b.score, 0) / history.filter(s => !s.isMiniSimulado).length).toFixed(1)}` : '0'} icon={<CheckCircle2 className="text-emerald-600" />} />
                  <StatCard label="Status da Conta" value={profile?.isUpgraded ? 'Premium' : 'Gratuito'} icon={<ShieldCheck className="text-amber-600" />} />
                </div>

                {!profile?.isUpgraded && (
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl mb-10 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-2">Desbloqueie todo o seu potencial!</h3>
                      <p className="text-indigo-100 mb-6 max-w-md">Faça o upgrade para o plano Premium e tenha acesso ilimitado a simulados, ranking completo e estatísticas detalhadas.</p>
                      <button 
                        onClick={() => setView('upgrade')}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                      >
                        Fazer Upgrade Agora
                      </button>
                    </div>
                    <Trophy className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
                  </div>
                )}

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
                <UpgradePage onBack={() => setView('dashboard')} userId={user.uid} email={user.email || ''} />
              </motion.div>
            )}

            {view === 'performance' && (
              <motion.div key="performance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PerformancePage 
                  history={history} 
                  allSimulations={allSimulations} 
                  allUsers={allUsers}
                  profile={profile} 
                  onUpgrade={() => setView('upgrade')} 
                />
              </motion.div>
            )}

            {view === 'mini_simulados' && (
              <motion.div key="mini_simulados" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Mini-Simulados</h2>
                    <p className="text-slate-500">Escolha uma matéria e responda 10 questões rapidamente.</p>
                  </div>
                </div>

                {!profile?.isUpgraded ? (
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl mb-10 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-2">Recurso Premium</h3>
                      <p className="text-indigo-100 mb-6 max-w-md">Os mini-simulados são exclusivos para usuários Premium. Faça o upgrade para ter acesso a este e outros recursos incríveis!</p>
                      <button 
                        onClick={() => setView('upgrade')}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                      >
                        Fazer Upgrade Agora
                      </button>
                    </div>
                    <Target className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(questions.reduce((acc, q) => {
                      let subject = q.law || q.category || 'Sem Matéria';
                      if (subject === 'Leis') subject = 'Provas Anteriores';
                      acc[subject] = (acc[subject] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)).map(([subject, count]) => (
                      <div 
                        key={subject} 
                        onClick={() => startMiniSimulation(subject)}
                        className={`p-6 rounded-2xl border shadow-sm flex flex-col cursor-pointer transition-all group ${
                          activeMiniSimulation?.subject === subject 
                            ? 'bg-emerald-50 border-emerald-500 hover:shadow-md' 
                            : 'bg-white border-slate-200 hover:border-indigo-600 hover:shadow-md'
                        }`}
                      >
                        <h3 className={`text-lg font-bold mb-2 transition-colors ${
                          activeMiniSimulation?.subject === subject 
                            ? 'text-emerald-700' 
                            : 'text-slate-800 group-hover:text-indigo-600'
                        }`}>{subject}</h3>
                        <div className="flex items-center justify-between mt-auto">
                          <p className={`text-sm font-medium ${
                            activeMiniSimulation?.subject === subject ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                            {activeMiniSimulation?.subject === subject ? 'Em andamento' : `${count} questões disponíveis`}
                          </p>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            activeMiniSimulation?.subject === subject 
                              ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' 
                              : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}>
                            <Play className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {view === 'simulation' && (
              <motion.div key="simulation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto">
                {!examFinished ? (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-slate-900">Simulado em Andamento</h2>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4">
                          <div className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold text-sm">
                            {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{ (elapsedTime % 60).toString().padStart(2, '0')}
                          </div>
                          <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold text-sm">
                            Questão {examIndex + 1} de {currentExam.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
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
                                      setActiveMiniSimulation(null);
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
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-600 text-sm font-bold transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            {isMiniSimulado ? 'Cancelar Mini-Simulado' : 'Cancelar Simulado'}
                          </button>
                          <button 
                            onClick={() => {
                              setReportingQuestion(currentExam[examIndex]);
                              setIsReportingError(true);
                            }}
                            className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Informar Erro na Questão
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mb-6">
                      {currentExam[examIndex]?.law && (
                        <div className="mb-4 inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg uppercase tracking-wider border border-indigo-100">
                          {currentExam[examIndex].law}
                        </div>
                      )}
                      <p className="text-xl text-slate-800 font-medium leading-relaxed mb-8" translate="no">
                        {currentExam[examIndex]?.text}
                      </p>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {currentExam[examIndex]?.shuffledOptions.map((option, idx) => {
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
                              <span className="flex-1 text-slate-700 font-medium" translate="no">{option.text}</span>
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
                                    {String.fromCharCode(65 + currentExam[examIndex].shuffledOptions.findIndex(o => o.id === currentExam[examIndex].correctOption))}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {currentExam[examIndex].justification && (
                            <div className="text-slate-600 text-sm leading-relaxed" translate="no">
                              <span className="font-bold block mb-1">Justificativa:</span>
                              {(() => {
                                const correctOptionLetter = String.fromCharCode(65 + currentExam[examIndex].shuffledOptions.findIndex(o => o.id === currentExam[examIndex].correctOption));
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
                            onClick={nextQuestion}
                            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                          >
                            {examIndex < currentExam.length - 1 ? 'Próxima Questão' : 'Ver Resultado Final'}
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}
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
              <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Meu Histórico</h2>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Acertos</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Total</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Aproveitamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              h.isMiniSimulado ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {h.isMiniSimulado ? 'Mini' : 'Simulado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {h.date?.toDate ? h.date.toDate().toLocaleString() : 'Recent'}
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-600">{h.score}</td>
                          <td className="px-6 py-4 text-slate-600">{h.totalQuestions}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              (h.score / h.totalQuestions) >= 0.7 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {((h.score / h.totalQuestions) * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {view === 'ranking' && (
              <motion.div key="ranking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">Ranking Geral</h2>
                  {!profile?.isUpgraded && (
                    <span className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-sm font-bold">
                      <Lock className="w-4 h-4" />
                      Acesso Limitado (Upgrade necessário)
                    </span>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative">
                  {!profile?.isUpgraded && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center">
                      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-sm">
                        <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Ranking Bloqueado</h3>
                        <p className="text-slate-500 mb-6">Faça o upgrade para ver sua posição e comparar seu desempenho com outros sargentos.</p>
                        <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                          Ver Planos
                        </button>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-20">Posição</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Sargento (Anônimo)</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Melhor Pontuação</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedRanking.map((r, idx) => (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.userId === user.uid ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                              idx === 0 ? 'bg-amber-100 text-amber-700' : 
                              idx === 1 ? 'bg-slate-200 text-slate-700' : 
                              idx === 2 ? 'bg-orange-100 text-orange-700' : 
                              'text-slate-400'
                            }`}>
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {r.anonymousName} {r.userId === user.uid && <span className="text-xs font-normal text-indigo-600 ml-2">(Você)</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-black text-indigo-600">
                              {r.score}
                              {r.diff !== 0 && (
                                <sup className={`text-xs ml-0.5 ${r.diff && r.diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {r.diff && r.diff > 0 ? `+${r.diff}` : r.diff}
                                </sup>
                              )}
                            </span>
                            <span className="text-slate-400 text-sm ml-1">/ {r.totalQuestions}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {r.date?.toDate ? r.date.toDate().toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
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
            {view === 'admin_users' && profile?.role === 'admin' && (
              <motion.div key="admin_users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Gestão de Usuários</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard label="Total de Simulados" value={allSimulations.filter(s => !s.isMiniSimulado).length} icon={<History className="text-indigo-600" />} />
                  <StatCard label="Média de Acertos" value={allSimulations.filter(s => !s.isMiniSimulado).length > 0 ? `${(allSimulations.filter(s => !s.isMiniSimulado).reduce((a, b) => a + b.score, 0) / allSimulations.filter(s => !s.isMiniSimulado).length).toFixed(1)}` : '0'} icon={<CheckCircle2 className="text-emerald-600" />} />
                  <StatCard label="Total de Usuários" value={allUsers.length} icon={<Users className="text-slate-600" />} />
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsers.map((u) => (
                    <div key={u.uid} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL} className="w-12 h-12 rounded-2xl border border-slate-100 shadow-sm" alt="" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-slate-900 leading-tight truncate">{u.displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'users', u.uid), { isActive: !u.isActive });
                              } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                            }}
                            className={`p-2 rounded-xl transition-colors ${
                              u.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                            }`}
                            title={u.isActive ? 'Desativar' : 'Ativar'}
                          >
                            {u.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => deleteUserSimulations(u.uid)}
                            className="p-2 bg-slate-50 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                            title="Limpar Mini-Simulados"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plano</p>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                title: 'Confirmar Alteração de Plano',
                                message: `Deseja realmente alterar o plano de ${u.displayName} para ${u.isUpgraded ? 'Gratuito' : 'Premium'}?`,
                                onConfirm: async () => {
                                  try {
                                    await updateDoc(doc(db, 'users', u.uid), { 
                                      isUpgraded: !u.isUpgraded,
                                      upgradedAt: !u.isUpgraded ? serverTimestamp() : null
                                    });
                                  } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                                }
                              });
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-colors uppercase tracking-wider ${
                              u.isUpgraded ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {u.isUpgraded ? 'Premium' : 'Gratuito'}
                          </button>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Papel</p>
                          <button 
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'users', u.uid), { role: u.role === 'admin' ? 'user' : 'admin' });
                              } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Usuário'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">
                            {allSimulations.filter(s => s.userId === u.uid).length} simulados
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-600">
                            {allSimulations.filter(s => s.userId === u.uid).length > 0 
                              ? (allSimulations.filter(s => s.userId === u.uid).reduce((a, b) => a + b.score, 0) / allSimulations.filter(s => s.userId === u.uid).length).toFixed(1)
                              : '0'
                            } média
                          </span>
                        </div>
                      </div>

                      {u.isUpgraded && (
                        <div className="pt-4 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Adesão Premium</p>
                          <p className="text-xs font-medium text-slate-600">
                            {u.upgradedAt ? (
                              new Date(u.upgradedAt?.seconds ? u.upgradedAt.seconds * 1000 : u.upgradedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : 'Data não registrada'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'admin_questions' && profile?.role === 'admin' && (
              <motion.div key="admin_questions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <AdminQuestions 
                  questions={questions}
                  profile={profile}
                  setNotification={setNotification}
                  setConfirmModal={setConfirmModal}
                  downloadPDF={downloadPDF}
                  onBack={() => setView('dashboard')}
                />
              </motion.div>
            )}
            {view === 'admin_errors' && (profile?.role === 'admin' || user?.email === 'allanjonesms@gmail.com') && (
              <motion.div key="admin_errors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Erros Relatados</h2>
                  <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-sm font-bold text-slate-500">Total: {allErrors.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {allErrors.length > 0 ? (
                    allErrors.map((err) => (
                      <div key={err.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                err.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {err.status === 'pending' ? 'Pendente' : 'Resolvido'}
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                {err.createdAt?.toDate ? err.createdAt.toDate().toLocaleString() : 'Recent'}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">Relatado por: {err.userEmail}</h4>
                            <p className="text-xs text-slate-400 font-mono">ID Questão: {err.questionId}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'question_errors', err.id), {
                                    status: err.status === 'pending' ? 'resolved' : 'pending',
                                    updatedAt: serverTimestamp()
                                  });
                                  if (err.status === 'pending') {
                                    await sendNotification(
                                      err.userId,
                                      'Erro Corrigido',
                                      `O erro que você relatou na questão "${err.questionText}" foi corrigido. Obrigado pela sua contribuição!`,
                                      'success'
                                    );
                                  }
                                } catch (e) {
                                  setNotification({ message: 'Erro ao atualizar status', type: 'error' });
                                }
                              }}
                              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                err.status === 'pending' 
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' 
                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'
                              }`}
                            >
                              {err.status === 'pending' ? 'Marcar como Resolvido' : 'Marcar como Pendente'}
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmModal({
                                  title: "Excluir Relatório",
                                  message: "Deseja excluir este relatório de erro permanentemente?",
                                  onConfirm: async () => {
                                    try {
                                      await deleteDoc(doc(db, 'question_errors', err.id));
                                      setNotification({ message: 'Relatório excluído', type: 'success' });
                                    } catch (e) {
                                      setNotification({ message: 'Erro ao excluir', type: 'error' });
                                    }
                                  }
                                });
                              }}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Enunciado da Questão</p>
                            <p className="text-slate-700 text-sm italic" translate="no">"{err.questionText}"</p>
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Descrição do Erro</p>
                            <p className="text-indigo-900 text-sm font-medium" translate="no">{err.description}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                      Nenhum erro relatado até o momento.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      {/* Report Error Modal */}
      <AnimatePresence>
      {isReportingError && reportingQuestion && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Informar Erro</h3>
              </div>
              <button 
                onClick={() => {
                  setIsReportingError(false);
                  setErrorDescription('');
                  setReportingQuestion(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Questão Selecionada</p>
                <p className="text-slate-700 text-sm line-clamp-3 italic" translate="no">
                  "{reportingQuestion.text}"
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descreva o erro encontrado</label>
                <textarea 
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-0 transition-all outline-none" 
                  rows={4}
                  value={errorDescription}
                  onChange={(e) => setErrorDescription(e.target.value)}
                  placeholder="Ex: A alternativa correta está errada, erro de digitação, etc..."
                  translate="no"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleReportError}
                  disabled={!errorDescription.trim()}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-indigo-200"
                >
                  Enviar Relatório
                </button>
                <button 
                  onClick={() => {
                    setIsReportingError(false);
                    setErrorDescription('');
                    setReportingQuestion(null);
                  }}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 md:w-5 md:h-5' })}
      <span className="text-[10px] md:text-base whitespace-nowrap">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7' })}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
