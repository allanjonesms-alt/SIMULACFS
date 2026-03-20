import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export const useMiniSimulado = (
  profile: any,
  questions: any[],
  isMiniSimulado: boolean,
  setIsMiniSimulado: (isMini: boolean) => void,
  activeMiniSimulation: any | null,
  setActiveMiniSimulation: (active: any | null) => void,
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
    const subjectQuestions = questions.filter(q => (q.law || q.category || 'Sem Matéria') === subject || (subject === 'Provas Anteriores' && q.law === 'Leis'));
    const shuffled = [...subjectQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
    
    setIsMiniSimulado(true);
    setActiveMiniSimulation({
      subject,
      questions: shuffled,
      currentIndex: 0,
      answers: [],
      elapsedTime: 0
    });
    setCurrentExam(shuffled);
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

  return {
    activeMiniSimulation,
    setActiveMiniSimulation,
    startMiniSimulation,
    startNewMiniSimulation
  };
};
