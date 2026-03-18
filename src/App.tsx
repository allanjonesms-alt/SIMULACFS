import React, { useState, useEffect } from 'react';
import { 
  auth, db, googleProvider, 
  handleFirestoreError, OperationType 
} from './firebase';
import { 
  onAuthStateChanged, signInWithPopup, signOut, User 
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, onSnapshot, 
  query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs 
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
  Play,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Trash2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Question, SimulationResult } from './types';
import UpgradePage from './components/UpgradePage';

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
  const [view, setView] = useState<'dashboard' | 'simulation' | 'history' | 'ranking' | 'admin_users' | 'admin_questions' | 'upgrade'>('dashboard');
  
  // Data states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [ranking, setRanking] = useState<SimulationResult[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Simulation state
  const [currentExam, setCurrentExam] = useState<ExamQuestion[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // Stores the ID of the selected option
  const [examFinished, setExamFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedLaws, setExpandedLaws] = useState<Record<string, boolean>>({});

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
          // Auto-upgrade to admin and premium if email matches
          if (isAdminEmail && (data.role !== 'admin' || !data.isUpgraded)) {
            const updates: Partial<UserProfile> = {};
            if (data.role !== 'admin') updates.role = 'admin';
            if (!data.isUpgraded) updates.isUpgraded = true;
            
            await updateDoc(doc(db, 'users', user.uid), updates);
            setProfile({ ...data, ...updates });
          } else {
            setProfile(data);
          }
        } else {
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

    // Ranking listener (all)
    const rQuery = query(collection(db, 'simulations'), orderBy('score', 'desc'), limit(50));
    const rUnsubscribe = onSnapshot(rQuery, (snapshot) => {
      const rList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimulationResult));
      setRanking(rList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'simulations'));

    // Admin: Users listener
    if (profile.role === 'admin') {
      const uUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const uList = snapshot.docs.map(doc => doc.data() as UserProfile);
        setAllUsers(uList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
      
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

      return () => {
        qUnsubscribe();
        hUnsubscribe();
        rUnsubscribe();
        uUnsubscribe();
        activeUnsubscribe();
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
      rUnsubscribe();
      activeUnsubscribe();
    };
  }, [user, profile]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', '', ''],
    correctOption: 0,
    category: 'Lei 127/2008'
  });

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

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
      
      setNotification({ message: `Simulados do usuário deletados com sucesso. (${querySnapshot.size} documentos)`, type: 'success' });
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
      const optionsWithIds: ShuffledOption[] = q.options.map((text, index) => ({
        id: index,
        text
      }));
      // Shuffle the options themselves
      const shuffledOptions = [...optionsWithIds].sort(() => 0.5 - Math.random());
      return {
        ...q,
        shuffledOptions
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

      setCurrentExam(selectedQuestions);
      setExamIndex(0);
      setAnswers([]);
      setElapsedTime(0);
      setExamFinished(false);
      setShowFeedback(false);
      setSelectedOptionId(null);
      setView('simulation');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'active_simulations');
    }
  };

  const resumeSimulation = () => {
    if (!activeSimulation) return;
    setCurrentExam(activeSimulation.questions);
    setExamIndex(activeSimulation.currentIndex);
    setAnswers(activeSimulation.answers);
    setElapsedTime(activeSimulation.elapsedTime || 0);
    setExamFinished(false);
    setShowFeedback(false);
    setSelectedOptionId(null);
    setView('simulation');
  };

  const submitAnswer = (optionId: number) => {
    if (showFeedback) return;
    setSelectedOptionId(optionId);
    setShowFeedback(true);
  };

  const nextQuestion = async () => {
    const newAnswers = [...answers, selectedOptionId!];
    setAnswers(newAnswers);
    setShowFeedback(false);
    setSelectedOptionId(null);
    
    if (examIndex < currentExam.length - 1) {
      const nextIdx = examIndex + 1;
      setExamIndex(nextIdx);
      
      // Update active simulation state
      try {
        await updateDoc(doc(db, 'active_simulations', user!.uid), {
          currentIndex: nextIdx,
          answers: newAnswers,
          updatedAt: serverTimestamp(),
          elapsedTime: elapsedTime || 0
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'active_simulations');
      }
    } else {
      finishExam(newAnswers);
    }
  };

  const finishExam = async (finalAnswers: number[]) => {
    let score = 0;
    currentExam.forEach((q, idx) => {
      // Check if the ID of the selected option matches the correctOption index
      if (q.correctOption === finalAnswers[idx]) {
        score++;
      }
    });

    const result: Omit<SimulationResult, 'id'> = {
      userId: user!.uid,
      score,
      totalQuestions: currentExam.length,
      date: serverTimestamp(),
      anonymousName: profile!.anonymousName,
      elapsedTime: elapsedTime || 0
    };

    try {
      await addDoc(collection(db, 'simulations'), result);
      
      // Delete active simulation state
      await deleteDoc(doc(db, 'active_simulations', user!.uid));
      
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
            className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-white ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
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

      {/* New Question Modal */}
      <AnimatePresence>
        {isAddingQuestion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Nova Questão</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Enunciado</label>
                  <textarea 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    rows={3}
                    placeholder="Digite o enunciado da questão..."
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                  />
                </div>
                {newQuestion.options?.map((opt, i) => (
                  <div key={i}>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Alternativa {String.fromCharCode(65 + i)}</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder={`Opção ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(newQuestion.options || [])];
                        newOpts[i] = e.target.value;
                        setNewQuestion({...newQuestion, options: newOpts});
                      }}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Índice da Correta (0-4)</label>
                    <input 
                      type="number" 
                      min="0" max="4"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newQuestion.correctOption}
                      onChange={(e) => setNewQuestion({...newQuestion, correctOption: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Lei</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ex: LC 190/2014"
                      value={newQuestion.law || ''}
                      onChange={(e) => setNewQuestion({...newQuestion, law: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ex: Generalidades"
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({...newQuestion, category: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Justificativa (Artigo da Lei)</label>
                  <textarea 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    rows={2}
                    placeholder="Ex: Art. 5º, inciso X da CF/88..."
                    value={newQuestion.justification || ''}
                    onChange={(e) => setNewQuestion({...newQuestion, justification: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={async () => {
                      if (!newQuestion.text || newQuestion.options?.some(o => !o)) {
                        setNotification({ message: 'Preencha todos os campos', type: 'error' });
                        return;
                      }
                      try {
                        await addDoc(collection(db, 'questions'), {
                          ...newQuestion,
                          createdAt: serverTimestamp()
                        });
                        setIsAddingQuestion(false);
                        setNewQuestion({ text: '', options: ['', '', '', '', ''], correctOption: 0, category: 'Lei 127/2008' });
                        setNotification({ message: 'Questão adicionada com sucesso!', type: 'success' });
                      } catch (e) {
                        setNotification({ message: 'Erro ao adicionar questão', type: 'error' });
                      }
                    }}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
                  >
                    Salvar Questão
                  </button>
                  <button 
                    onClick={() => setIsAddingQuestion(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Sidebar */}
        <nav className="w-full md:w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <SergeantIcon />
            </div>
            <span className="text-xl font-bold text-slate-900">SimulaCFS</span>
          </div>

          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem active={view === 'history'} onClick={() => setView('history')} icon={<History />} label="Meu Histórico" />
          <NavItem active={view === 'ranking'} onClick={() => setView('ranking')} icon={<Trophy />} label="Ranking Geral" />
          {!profile?.isUpgraded && (
            <NavItem active={view === 'upgrade'} onClick={() => setView('upgrade')} icon={<Zap />} label="Upgrade" />
          )}
          
          {(profile?.role === 'admin' || user?.email === 'allanjonesms@gmail.com') && (
            <>
              <div className="mt-8 mb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Admin</div>
              <NavItem active={view === 'admin_users'} onClick={() => setView('admin_users')} icon={<Users />} label="Usuários" />
              <NavItem active={view === 'admin_questions'} onClick={() => setView('admin_questions')} icon={<PlusCircle />} label="Questões" />
            </>
          )}

          <div className="mt-auto pt-6 border-t border-slate-100">
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
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Olá, {profile?.displayName}! 👋</h2>
                    <p className="text-slate-500">Bem-vindo de volta ao seu painel de estudos.</p>
                  </div>
                  {user.email === 'allanjonesms@gmail.com' && (
                    <button
                      onClick={() => setView('upgrade')}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                      [TESTE] Ir para Upgrade
                    </button>
                  )}
                  <button 
                    onClick={activeSimulation ? resumeSimulation : startSimulation}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {activeSimulation ? 'Continuar Simulado' : 'Iniciar Simulado'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <StatCard label="Simulados Realizados" value={history.length} icon={<History className="text-indigo-600" />} />
                  <StatCard label="Média de Acertos" value={history.length > 0 ? `${(history.reduce((a, b) => a + b.score, 0) / history.length).toFixed(1)}` : '0'} icon={<CheckCircle2 className="text-emerald-600" />} />
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
                      Nenhum simulado realizado ainda.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {view === 'upgrade' && (
              <motion.div key="upgrade" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <UpgradePage onBack={() => setView('dashboard')} userId={user.uid} />
              </motion.div>
            )}

            {view === 'simulation' && (
              <motion.div key="simulation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto">
                {!examFinished ? (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-slate-900">Simulado em Andamento</h2>
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold text-sm">
                          {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{ (elapsedTime % 60).toString().padStart(2, '0')}
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold text-sm">
                          Questão {examIndex + 1} de {currentExam.length}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mb-6">
                      {currentExam[examIndex]?.law && (
                        <div className="mb-4 inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg uppercase tracking-wider border border-indigo-100">
                          {currentExam[examIndex].law}
                        </div>
                      )}
                      <p className="text-xl text-slate-800 font-medium leading-relaxed mb-8">
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
                              <span className="flex-1 text-slate-700 font-medium">{option.text}</span>
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
                            <div className="text-slate-600 text-sm leading-relaxed">
                              <span className="font-bold block mb-1">Justificativa:</span>
                              {(() => {
                                const correctOptionLetter = String.fromCharCode(65 + currentExam[examIndex].shuffledOptions.findIndex(o => o.id === currentExam[examIndex].correctOption));
                                return currentExam[examIndex].justification.replace(/A alternativa [A-E] é a correta/gi, `A alternativa ${correctOptionLetter} é a correta`);
                              })()}
                            </div>
                          )}

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
                  <div className="text-center bg-white p-12 rounded-3xl shadow-2xl border border-slate-100">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Simulado Concluído!</h2>
                    <p className="text-slate-500 mb-8">Parabéns pelo seu esforço. Veja seu resultado abaixo:</p>
                    
                    <div className="text-6xl font-black text-indigo-600 mb-4">
                      {answers.filter((a, i) => a === currentExam[i].correctOption).length} / {currentExam.length}
                    </div>
                    <p className="text-lg font-bold text-slate-700 mb-10">Questões Corretas</p>
                    
                    <button 
                      onClick={() => setView('dashboard')}
                      className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
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
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Acertos</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Total</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Aproveitamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50 transition-colors">
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
                        <p className="text-slate-500 mb-6">Faça o upgrade para ver sua posição e comparar seu desempenho com outros estudantes.</p>
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
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Estudante (Anônimo)</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Melhor Pontuação</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ranking.map((r, idx) => (
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
                            <span className="text-lg font-black text-indigo-600">{r.score}</span>
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

            {view === 'admin_users' && profile?.role === 'admin' && (
              <motion.div key="admin_users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Gestão de Usuários</h2>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuário</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Plano</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={u.photoURL} className="w-8 h-8 rounded-full" alt="" />
                              <span className="font-bold text-slate-900">{u.displayName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setConfirmModal({
                                  title: 'Confirmar Alteração de Plano',
                                  message: `Deseja realmente alterar o plano de ${u.displayName} para ${u.isUpgraded ? 'Gratuito' : 'Premium'}?`,
                                  onConfirm: async () => {
                                    try {
                                      await updateDoc(doc(db, 'users', u.uid), { isUpgraded: !u.isUpgraded });
                                    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                                  }
                                });
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                u.isUpgraded ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {u.isUpgraded ? 'Premium' : 'Gratuito'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {u.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'users', u.uid), { isActive: !u.isActive });
                                } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`); }
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                u.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                              title={u.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {u.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                            </button>
                            <button 
                              onClick={() => deleteUserSimulations(u.uid)}
                              className="text-red-600 hover:text-red-800 font-bold text-xs p-2"
                              title="Limpar Simulados"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {view === 'admin_questions' && profile?.role === 'admin' && (
              <motion.div key="admin_questions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {Object.entries(questions.reduce((acc, q) => {
                    const law = q.law || 'Sem Lei';
                    acc[law] = (acc[law] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([law, count]) => (
                    <div key={law} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{law}</p>
                        <p className="text-2xl font-black text-slate-900">{count}</p>
                      </div>
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">Banco de Questões</h2>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setIsAddingQuestion(true)}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
                    >
                      <PlusCircle className="w-5 h-5" />
                      Nova Questão
                    </button>
                  </div>
                </div>

                {editingQuestion && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <h3 className="text-2xl font-bold mb-6">Editar Questão</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Enunciado</label>
                          <textarea 
                            className="w-full p-3 border rounded-xl" 
                            rows={3}
                            value={editingQuestion.text}
                            onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                          />
                        </div>
                        {editingQuestion.options.map((opt, i) => (
                          <div key={i}>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Alternativa {String.fromCharCode(65 + i)}</label>
                            <input 
                              type="text" 
                              className="w-full p-3 border rounded-xl"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...editingQuestion.options];
                                newOpts[i] = e.target.value;
                                setEditingQuestion({...editingQuestion, options: newOpts});
                              }}
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Índice da Correta (0-4)</label>
                          <input 
                            type="number" 
                            min="0" max="4"
                            className="w-full p-3 border rounded-xl"
                            value={editingQuestion.correctOption}
                            onChange={(e) => setEditingQuestion({...editingQuestion, correctOption: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Lei</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl"
                            value={editingQuestion.law || ''}
                            onChange={(e) => setEditingQuestion({...editingQuestion, law: e.target.value})}
                            placeholder="Ex: LC 190/2014"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl"
                            value={editingQuestion.category || ''}
                            onChange={(e) => setEditingQuestion({...editingQuestion, category: e.target.value})}
                            placeholder="Ex: Generalidades"
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button 
                            onClick={async () => {
                              try {
                                const { id, ...data } = editingQuestion;
                                await updateDoc(doc(db, 'questions', id), data);
                                setEditingQuestion(null);
                                setNotification({ message: 'Questão atualizada!', type: 'success' });
                              } catch (e) {
                                setNotification({ message: 'Erro ao salvar', type: 'error' });
                              }
                            }}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold"
                          >
                            Salvar Alterações
                          </button>
                          <button 
                            onClick={() => setEditingQuestion(null)}
                            className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-12">
                  {(Object.entries(questions.reduce((acc, q) => {
                    const law = q.law || 'Sem Lei';
                    if (!acc[law]) acc[law] = [];
                    acc[law].push(q);
                    return acc;
                  }, {} as Record<string, Question[]>)) as [string, Question[]][]).map(([law, lawQuestions]) => {
                    const isExpanded = expandedLaws[law] ?? false;
                    return (
                    <div key={law} className="space-y-6">
                      <div 
                        className="flex items-center gap-4 cursor-pointer group"
                        onClick={() => setExpandedLaws(prev => ({ ...prev, [law]: !isExpanded }))}
                      >
                        <div className="h-px flex-1 bg-slate-200"></div>
                        <div className="flex items-center gap-2 px-4 bg-slate-50/50 rounded-full py-1 border border-slate-200 hover:bg-slate-100 transition-colors">
                          <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">
                            {law} ({lawQuestions.length})
                          </h3>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                        <div className="h-px flex-1 bg-slate-200"></div>
                      </div>
                      
                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-6">
                          {lawQuestions.map((q) => (
                            <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">
                                      ID: {q.id.slice(0, 5)}
                                    </span>
                                    {q.law && (
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">
                                        {q.law}
                                      </span>
                                    )}
                                    {q.category && (
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">
                                        {q.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-bold text-slate-900 whitespace-pre-wrap">{q.text}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingQuestion(q);
                                    }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                  >
                                    <Settings className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmModal({
                                        title: "Excluir Questão",
                                        message: "Tem certeza que deseja excluir esta questão permanentemente?",
                                        onConfirm: async () => {
                                          try {
                                            await deleteDoc(doc(db, 'questions', q.id));
                                            setNotification({ message: 'Questão excluída', type: 'success' });
                                          } catch (e) {
                                            setNotification({ message: 'Erro ao excluir', type: 'error' });
                                          }
                                        }
                                      });
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt, i) => (
                                  <div key={i} className={`p-3 rounded-xl border text-sm ${i === q.correctOption ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                    {String.fromCharCode(65 + i)}) {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                  
                  {questions.length === 0 && (
                    <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                      Nenhuma questão cadastrada. Use os botões acima para começar.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}

// --- Helper Components ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      {label}
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
