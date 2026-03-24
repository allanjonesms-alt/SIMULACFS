import { useState, useRef, useCallback, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, setDoc, writeBatch, collection, getDoc, increment, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logPageVisit } from '../firebase';
import { Question, SimulationResult, UserProfile } from '../types';

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

export const useSimulation = (
  user: any,
  profile: UserProfile | null,
  questions: Question[],
  history: SimulationResult[],
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void,
  setView: (view: any) => void
) => {
  const [currentExam, setCurrentExam] = useState<ExamQuestion[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [examFinished, setExamFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasRatedCurrentQuestion, setHasRatedCurrentQuestion] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    let interval: any;
    if (examFinished || isPaused) {
      clearInterval(interval);
    } else {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [examFinished, isPaused]);

  const saveSimulation = useCallback(async (userId: string, data: any) => {
    try {
      await updateDoc(doc(db, 'active_simulations', userId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'active_simulations');
    }
  }, []);

  // Removed useEffect that saved simulation on every change

  const selectQuestions = (
    questions: Question[],
    counts: { high: number, medium: number, low: number }
  ): Question[] => {
    const high = questions.filter(q => (q.difficulty || 3) >= 4);
    const medium = questions.filter(q => (q.difficulty || 3) === 3);
    const low = questions.filter(q => (q.difficulty || 3) <= 2);

    const selected: Question[] = [];
    const categories = Array.from(new Set(questions.map(q => q.law || q.category || 'Outros')));

    // Ensure at least one from each category
    categories.forEach(cat => {
      const catQuestions = questions.filter(q => (q.law || q.category || 'Outros') === cat);
      if (catQuestions.length > 0) {
        const q = catQuestions[Math.floor(Math.random() * catQuestions.length)];
        if (!selected.find(s => s.id === q.id)) selected.push(q);
      }
    });

    // Helper to add questions
    const addQuestions = (pool: Question[], count: number) => {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      for (const q of shuffled) {
        if (selected.length >= counts.high + counts.medium + counts.low) break;
        if (!selected.find(s => s.id === q.id)) selected.push(q);
      }
    };

    addQuestions(high, counts.high);
    addQuestions(medium, counts.medium);
    addQuestions(low, counts.low);

    // Fallback if not enough
    if (selected.length < counts.high + counts.medium + counts.low) {
      const remaining = questions.filter(q => !selected.find(s => s.id === q.id));
      const needed = (counts.high + counts.medium + counts.low) - selected.length;
      selected.push(...remaining.sort(() => 0.5 - Math.random()).slice(0, needed));
    }

    return selected.sort(() => 0.5 - Math.random());
  };

  const startSimulation = async (isMiniSimulado: boolean) => {
    if (activeSimulation) {
      setNotification({ message: 'Você já tem um simulado em andamento. Por favor, retome-o.', type: 'error' });
      return;
    }
    
    if (!profile?.isActive) {
      setNotification({ message: 'Sua conta está desativada. Entre em contato com o administrador.', type: 'error' });
      return;
    }
    
    if (!profile.isUpgraded && history.length >= 1) {
      setNotification({ message: 'Você já realizou seu simulado gratuito. Faça o upgrade!', type: 'error' });
      return;
    }

    const portugueseQuestions = questions.filter(q => q.law === 'Língua Portuguesa');
    const otherQuestions = questions.filter(q => q.law !== 'Língua Portuguesa');

    if (portugueseQuestions.length === 0 && otherQuestions.length === 0) {
      setNotification({ message: 'Nenhuma questão disponível no momento.', type: 'error' });
      return;
    }

    let selectedQuestions: Question[] = [];

    if (isMiniSimulado) {
      selectedQuestions = selectQuestions(questions, { high: 6, medium: 3, low: 1 });
    } else {
      const selectedPortuguese = selectQuestions(portugueseQuestions, { high: 12, medium: 6, low: 2 });
      const selectedOthers = selectQuestions(otherQuestions, { high: 18, medium: 8, low: 4 });
      selectedQuestions = [...selectedPortuguese, ...selectedOthers];
    }

    const examQuestions = selectedQuestions.map(q => {
      return {
        ...q,
        shuffledOptions: q.options.map((text, index) => ({ id: index, text }))
      };
    });

    try {
      if (!isMiniSimulado) {
        await setDoc(doc(db, 'active_simulations', user!.uid), {
          userId: user!.uid,
          questions: examQuestions,
          currentIndex: 0,
          answers: [],
          updatedAt: serverTimestamp(),
          elapsedTime: 0
        });
      }
      
      // Log simulation start
      await logPageVisit(user!.uid, isMiniSimulado ? 'mini-simulado' : 'simulado');

      setCurrentExam(examQuestions);
      setExamIndex(0);
      setAnswers([]);
      setElapsedTime(0);
      setExamFinished(false);
      setShowFeedback(false);
      setSelectedOptionId(null);
      setHasRatedCurrentQuestion(false);
      setPendingRating(null);
      setIsPaused(false);
      setView('simulation');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'active_simulations');
    }
  };

  const resumeSimulation = () => {
    if (!activeSimulation || !activeSimulation.questions || activeSimulation.questions.length === 0) return;
    
    // Ensure all questions have shuffledOptions
    const restoredQuestions = activeSimulation.questions.map(q => {
      if (!q.shuffledOptions || q.shuffledOptions.length === 0) {
        return {
          ...q,
          shuffledOptions: q.options.map((text, index) => ({ id: index, text }))
        };
      }
      return q;
    });

    setCurrentExam(restoredQuestions);
    setExamIndex(activeSimulation.currentIndex);
    setAnswers(activeSimulation.answers || []);
    setElapsedTime(activeSimulation.elapsedTime || 0);
    setExamFinished(false);
    setShowFeedback(false);
    setSelectedOptionId(null);
    setHasRatedCurrentQuestion(false);
    setPendingRating(null);
    setIsPaused(false);
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

  const nextQuestion = async (isMiniSimulado: boolean) => {
    if (isSubmittingRef.current) return;
    
    const currentRating = pendingRating;
    const currentQuestionId = currentExam[examIndex].id;
    
    if (currentRating !== null) {
      await rateQuestion(currentQuestionId, currentRating);
    }

    const newAnswers = [...answers, selectedOptionId!];
    setAnswers(newAnswers);

    const isOdd = (examIndex + 1) % 2 !== 0;
    if (isOdd && examIndex < currentExam.length - 1) {
      setShowTip(true);
      return;
    }

    proceedToNext(newAnswers, isMiniSimulado);
  };

  const proceedToNext = async (currentAnswers: number[], isMiniSimulado: boolean) => {
    setShowFeedback(false);
    setSelectedOptionId(null);
    setHasRatedCurrentQuestion(false);
    setPendingRating(null);
    setShowTip(false);

    if (examIndex < currentExam.length - 1) {
      const nextIdx = examIndex + 1;
      setExamIndex(nextIdx);
      
      if (!isMiniSimulado) {
        saveSimulation(user!.uid, {
          currentIndex: nextIdx,
          answers: currentAnswers,
          elapsedTime: elapsedTime || 0
        });
      }
    } else {
      isSubmittingRef.current = true;
      try {
        await finishExam(currentAnswers, isMiniSimulado);
      } finally {
        isSubmittingRef.current = false;
      }
    }
  };

  const finishExam = async (finalAnswers: number[], isMiniSimulado: boolean) => {
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
      // 1. Save the simulation result first
      const simulationRef = doc(collection(db, 'simulations'));
      await setDoc(simulationRef, result);
      
      // 2. Delete active simulation if not mini
      if (!isMiniSimulado) {
        try {
          await deleteDoc(doc(db, 'active_simulations', user!.uid));
        } catch (e) {
          console.warn('Could not delete active simulation', e);
        }
      }
      
      // 3. Update question stats individually so one failure doesn't block the whole result
      // This is crucial for simulations with old question IDs that might have been migrated
      const updatePromises = currentExam.map(async (q, idx) => {
        try {
          const isCorrect = q.correctOption === finalAnswers[idx];
          const qRef = doc(db, 'questions', q.id);
          await updateDoc(qRef, {
            totalResponses: increment(1),
            totalCorrects: increment(isCorrect ? 1 : 0)
          });
        } catch (e) {
          // Ignore errors for individual question stats (e.g. if question was deleted/migrated)
          console.warn(`Could not update stats for question ${q.id}`, e);
        }
      });
      await Promise.all(updatePromises);
      
      setExamFinished(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'simulations');
    }
  };

  return {
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
  };
};
