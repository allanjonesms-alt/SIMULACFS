import React from 'react';
import { motion } from 'motion/react';
import { Target, Play } from 'lucide-react';
import { useMiniSimulado } from '../hooks/useMiniSimulado';

interface MiniSimuladoPageProps {
  profile: any;
  questions: any[];
  isMiniSimulado: boolean;
  setIsMiniSimulado: (isMini: boolean) => void;
  activeMiniSimulations: any[];
  setActiveMiniSimulations: (active: any[]) => void;
  setNotification: (notif: { message: string; type: 'success' | 'error' } | null) => void;
  setView: (view: any) => void;
  setCurrentExam: (exam: any[]) => void;
  setExamIndex: (index: number) => void;
  setAnswers: (answers: any[]) => void;
  setElapsedTime: (time: number) => void;
  setExamFinished: (finished: boolean) => void;
  setShowFeedback: (feedback: boolean) => void;
  setSelectedOptionId: (id: any | null) => void;
  setHasRatedCurrentQuestion: (rated: boolean) => void;
  setPendingRating: (rating: number | null) => void;
  setConfirmModal: (modal: any) => void;
  user: any;
  setPendingSimulationType: (type: 'full' | 'mini' | 'start_mini' | null) => void;
  setPendingSubject: (subject: string | null) => void;
  pendingSimulationType: 'full' | 'mini' | 'start_mini' | null;
  pendingSubject: string | null;
}

export const MiniSimuladoPage: React.FC<MiniSimuladoPageProps> = (props) => {
  const {
    activeMiniSimulations,
    setActiveMiniSimulations,
    startMiniSimulation,
  } = useMiniSimulado(
    props.profile,
    props.questions,
    props.isMiniSimulado,
    props.setIsMiniSimulado,
    props.activeMiniSimulations,
    props.setActiveMiniSimulations,
    props.setNotification,
    props.setView,
    props.setCurrentExam,
    props.setExamIndex,
    props.setAnswers,
    props.setElapsedTime,
    props.setExamFinished,
    props.setShowFeedback,
    props.setSelectedOptionId,
    props.setHasRatedCurrentQuestion,
    props.setPendingRating,
    props.setConfirmModal,
    props.user
  );

  // Handle starting mini simulation after instructions
  React.useEffect(() => {
    // @ts-ignore - we're using a special value to trigger start
    if (props.pendingSimulationType === 'start_mini' && props.pendingSubject) {
      startMiniSimulation(props.pendingSubject);
      props.setPendingSimulationType(null);
      props.setPendingSubject(null);
    }
  }, [props.pendingSimulationType, props.pendingSubject, startMiniSimulation]);

  return (
    <motion.div key="mini_simulados" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Mini-Simulados</h2>
          <p className="text-slate-500">Escolha uma matéria e responda 10 questões rapidamente.</p>
        </div>
      </div>

      {!props.profile?.isUpgraded ? (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Recurso Premium</h3>
            <p className="text-indigo-100 mb-6 max-w-md">Os mini-simulados são exclusivos para usuários Premium. Faça o upgrade para ter acesso a este e outros recursos incríveis!</p>
            <button 
              onClick={() => props.setView('upgrade')}
              className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
            >
              Fazer Upgrade Agora
            </button>
          </div>
          <Target className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries((props.questions || []).reduce((acc, q) => {
            let subject = q.law || q.category || 'Sem Matéria';
            if (subject === 'Leis') subject = 'Provas Anteriores';
            acc[subject] = (acc[subject] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)).map(([subject, count]) => (
              <div 
                key={subject} 
                onClick={() => {
                  if (activeMiniSimulations.some(s => s.subject === subject)) {
                    startMiniSimulation(subject);
                  } else {
                    props.setPendingSimulationType('mini');
                    props.setPendingSubject(subject);
                    props.setView('instructions');
                  }
                }}
                className={`p-6 rounded-2xl border shadow-sm flex flex-col cursor-pointer transition-all group ${
                  activeMiniSimulations.some(s => s.subject === subject)
                    ? 'bg-emerald-50 border-emerald-500 hover:shadow-md' 
                    : 'bg-white border-slate-200 hover:border-indigo-600 hover:shadow-md'
                }`}
              >
                <h3 className={`text-lg font-bold mb-2 transition-colors ${
                  activeMiniSimulations.some(s => s.subject === subject)
                    ? 'text-emerald-700' 
                    : 'text-slate-800 group-hover:text-indigo-600'
                }`}>{subject}</h3>
                <div className="flex items-center justify-between mt-auto">
                  <p className={`text-sm font-medium ${
                    activeMiniSimulations.some(s => s.subject === subject) ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {activeMiniSimulations.some(s => s.subject === subject) ? 'Em andamento' : 'Clique para iniciar'}
                  </p>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeMiniSimulations.some(s => s.subject === subject)
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
  );
};
