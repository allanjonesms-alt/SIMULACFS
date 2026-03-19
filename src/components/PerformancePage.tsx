import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList
} from 'recharts';
import { SimulationResult, UserProfile } from '../types';

interface PerformancePageProps {
  history: SimulationResult[];
  allSimulations: SimulationResult[];
  allUsers: UserProfile[];
  profile: UserProfile;
  onUpgrade: () => void;
}

export default function PerformancePage({ history, allSimulations, allUsers, profile, onUpgrade }: PerformancePageProps) {
  const [selectedUserId, setSelectedUserId] = React.useState<string>(profile.uid);

  const isAdmin = profile.role === 'admin';

  const userHistory = useMemo(() => {
    if (selectedUserId === profile.uid) return history;
    return allSimulations.filter(s => s.userId === selectedUserId).sort((a, b) => {
      const dateA = a.date?.toMillis?.() || (a.date?.seconds ? a.date.seconds * 1000 : 0);
      const dateB = b.date?.toMillis?.() || (b.date?.seconds ? b.date.seconds * 1000 : 0);
      return dateB - dateA;
    });
  }, [selectedUserId, profile.uid, history, allSimulations]);

  const selectedUser = useMemo(() => {
    return allUsers.find(u => u.uid === selectedUserId) || profile;
  }, [allUsers, selectedUserId, profile]);

  if (!profile.isUpgraded && !isAdmin) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Análise de Desempenho</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Faça upgrade para a conta Premium e tenha acesso a gráficos detalhados de desempenho por matéria, evolução histórica e comparação com outros alunos.
        </p>
        <button 
          onClick={onUpgrade}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Fazer Upgrade Agora
        </button>
      </div>
    );
  }

  // Data processing for charts
  
  // 1. Performance by subject
  const subjectData = useMemo(() => {
    const mySubjects: Record<string, { correct: number; total: number }> = {};
    const generalSubjects: Record<string, { correct: number; total: number }> = {};
    
    const normalizeSubject = (subject: string) => {
      let displaySubject = subject;
      if (
        subject.includes('Maria da Penha') || 
        subject.includes('9455') || 
        subject.includes('9.455') || 
        subject.includes('Estatuto do Desarmamento') || 
        subject.includes('10.826') || 
        subject.includes('10826') ||
        subject.includes('Antidrogas') ||
        subject.includes('Extravagantes')
      ) {
        displaySubject = 'Leis Extravagantes';
      } else {
        const s = subject.toUpperCase();
        if (s.includes('190')) displaySubject = 'LC 190';
        else if (s.includes('053') || s.includes(' 53') || s === 'LC 53') displaySubject = 'LC 053';
        else if (s.includes('127')) displaySubject = 'LC 127';
        else if (s.includes('PROCESSO PENAL MILITAR') || s === 'CPPM') displaySubject = 'CPPM';
        else if (s.includes('PENAL MILITAR') || s === 'CPM') displaySubject = 'CPM';
        else if (s.includes('CONSTITUIÇÃO DO ESTADO') || s.includes('CEMS') || s.includes('MATO GROSSO DO SUL')) displaySubject = 'CEMS';
        else if (s.includes('PORTUGU') || s.includes('LÍNGUA')) displaySubject = 'PORTUGUÊS';
      }
      return displaySubject;
    };

    userHistory.forEach(sim => {
      if (sim.subjectScores) {
        Object.entries(sim.subjectScores).forEach(([subject, scores]) => {
          const s = scores as { correct: number; total: number };
          const displaySubject = normalizeSubject(subject);
          if (!mySubjects[displaySubject]) {
            mySubjects[displaySubject] = { correct: 0, total: 0 };
          }
          mySubjects[displaySubject].correct += s.correct;
          mySubjects[displaySubject].total += s.total;
        });
      }
    });

    const otherSimulations = allSimulations.filter(s => s.userId !== selectedUserId);
    otherSimulations.forEach(sim => {
      if (sim.subjectScores) {
        Object.entries(sim.subjectScores).forEach(([subject, scores]) => {
          const s = scores as { correct: number; total: number };
          const displaySubject = normalizeSubject(subject);
          if (!generalSubjects[displaySubject]) {
            generalSubjects[displaySubject] = { correct: 0, total: 0 };
          }
          generalSubjects[displaySubject].correct += s.correct;
          generalSubjects[displaySubject].total += s.total;
        });
      }
    });

    return Object.entries(mySubjects).map(([name, scores]) => {
      const general = generalSubjects[name];
      return {
        name,
        meuDesempenho: Math.round((scores.correct / scores.total) * 100) || 0,
        mediaGeral: general && general.total > 0 ? Math.round((general.correct / general.total) * 100) : 0,
        correct: scores.correct,
        total: scores.total
      };
    }).sort((a, b) => b.meuDesempenho - a.meuDesempenho);
  }, [userHistory, allSimulations, selectedUserId]);

  // 2. Historical performance vs General Average
  const historicalData = useMemo(() => {
    // Calculate general average per day or overall?
    // Let's calculate the overall average of other users first
    const otherSimulations = allSimulations.filter(s => s.userId !== selectedUserId);
    const generalAverage = otherSimulations.length > 0 
      ? otherSimulations.reduce((acc, sim) => acc + ((sim.score / sim.totalQuestions) * 100), 0) / otherSimulations.length
      : 0;

    return userHistory.slice().reverse().map((sim, index) => {
      const date = sim.date?.toDate ? sim.date.toDate() : new Date();
      return {
        name: `Simulado ${index + 1}`,
        data: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        meuDesempenho: Math.round((sim.score / sim.totalQuestions) * 100),
        mediaGeral: Math.round(generalAverage)
      };
    });
  }, [userHistory, allSimulations, selectedUserId]);

  // 3. Average time per question vs General Average
  const timeData = useMemo(() => {
    const mySimulations = userHistory.filter(s => s.elapsedTime > 0 && s.totalQuestions > 0);
    const otherSimulations = allSimulations.filter(s => s.userId !== selectedUserId && s.elapsedTime > 0 && s.totalQuestions > 0);

    const myAvgTime = mySimulations.length > 0
      ? mySimulations.reduce((acc, sim) => acc + (sim.elapsedTime / sim.totalQuestions), 0) / mySimulations.length
      : 0;

    const otherAvgTime = otherSimulations.length > 0
      ? otherSimulations.reduce((acc, sim) => acc + (sim.elapsedTime / sim.totalQuestions), 0) / otherSimulations.length
      : 0;

    return [
      {
        name: 'Tempo Médio por Questão',
        meuTempo: Math.round(myAvgTime),
        mediaGeral: Math.round(otherAvgTime)
      }
    ];
  }, [userHistory, allSimulations, selectedUserId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-slate-900">
          {isAdmin && selectedUserId !== profile.uid ? `Desempenho: ${selectedUser.displayName}` : 'Meu Desempenho'}
        </h2>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ver Usuário:</label>
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-sm"
            >
              <option value={profile.uid}>Meu Desempenho (Eu)</option>
              {allUsers.filter(u => u.uid !== profile.uid).map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {userHistory.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-500">
          Realize seu primeiro simulado para ver as estatísticas de desempenho.
        </div>
      ) : (
        <>
          {/* Performance by Subject */}
          {subjectData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Desempenho por Matéria (% de Acertos)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === 'Meu Desempenho') {
                          return [`${value}% (${props.payload.correct}/${props.payload.total})`, name];
                        }
                        return [`${value}%`, name];
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="meuDesempenho" name="Meu Desempenho" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="meuDesempenho" position="top" fill="#4f46e5" fontSize={12} formatter={(val: number) => `${val}%`} />
                      <LabelList dataKey="correct" position="insideBottom" fill="#ffffff" fontSize={12} formatter={(val: number) => `${val} acertos`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Historical Performance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Evolução Histórica (% de Acertos)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="meuDesempenho" name="Meu Desempenho" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="mediaGeral" name="Média Geral" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Time per Question */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Tempo Médio por Questão</h3>
            <div className="h-64 w-full max-w-2xl mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `${val}s`} />
                  <YAxis type="category" dataKey="name" hide />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatTime(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="meuTempo" name="Meu Tempo" fill="#10b981" radius={[0, 4, 4, 0]} barSize={32} />
                  <Bar dataKey="mediaGeral" name="Média Geral" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
