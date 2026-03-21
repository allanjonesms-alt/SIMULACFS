import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export const useMiniSimulado = (
  profile: any,
  questions: any[],
  isMiniSimulado: boolean,
  setIsMiniSimulado: (isMini: boolean) => void,
  activeMiniSimulations: any[],
  setActiveMiniSimulations: (active: any[]) => void,
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void,
  setView: (view: any) => void,
  setCurrentExam: (exam: any[]) => void,
  setExamIndex: (index: number) => void,
  setAnswers: (answers: any[]) => void,
  setElapsedTime: (time: number) => void,
  setExamFinished: (finished: boolean) => void,
  setShowFeedback: (feedback: boolean) => void,
  setSelectedOptionId: (id: any | null) => void,
  setHasRatedCurrentQuestion: (rated: boolean) => void,
  setPendingRating: (rating: number | null) => void,
  setConfirmModal: (modal: any) => void,
  user: any
) => {
  const startNewMiniSimulation = (subject: string) => {
    const subjectQuestions = (questions || []).filter(q => (q.law || q.category || 'Sem Matéria') === subject || (subject === 'Provas Anteriores' && q.law === 'Leis'));
    const shuffled = [...subjectQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
    const examQuestions = shuffled.map(q => ({
      ...q,
      shuffledOptions: q.options.map((text: string, index: number) => ({ id: index, text }))
    }));
    
    setIsMiniSimulado(true);
    const newSim = {
      subject,
      questions: examQuestions,
      currentIndex: 0,
      answers: [],
      elapsedTime: 0
    };
    setActiveMiniSimulations([...activeMiniSimulations, newSim]);
    setCurrentExam(examQuestions);
    setExamIndex(0);
    setAnswers([]);
    setElapsedTime(0);
    setExamFinished(false);
    setShowFeedback(false);
    setSelectedOptionId(null);
    setHasRatedCurrentQuestion(false);
    setPendingRating(null);
    setView('simulation');
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

    const activeSim = activeMiniSimulations.find(s => s.subject === subject);
    if (activeSim) {
      setIsMiniSimulado(true);
      setCurrentExam(activeSim.questions);
      setExamIndex(activeSim.currentIndex);
      setAnswers(activeSim.answers);
      setElapsedTime(activeSim.elapsedTime);
      setExamFinished(false);
      setShowFeedback(false);
      setSelectedOptionId(null);
      setHasRatedCurrentQuestion(false);
      setPendingRating(null);
      setView('simulation');
      return;
    }

    if (activeMiniSimulations.length >= 2) {
      setNotification({ message: 'Você já tem dois mini-simulados ativos. Encerre um para iniciar outro.', type: 'error' });
      return;
    }

    startNewMiniSimulation(subject);
  };

  return {
    activeMiniSimulations,
    setActiveMiniSimulations,
    startMiniSimulation,
    startNewMiniSimulation
  };
};
