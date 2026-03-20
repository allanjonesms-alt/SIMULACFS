import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine
} from 'recharts';
import { SimulationResult, UserProfile } from '../types';
import { BarChart2, Target, ChevronDown } from 'lucide-react';

interface PerformancePageProps {
  history: SimulationResult[];
  allSimulations: SimulationResult[];
  allUsers: UserProfile[];
  profile: UserProfile;
  onUpgrade: () => void;
}

const normalizeSubject = (subject: string) => {
  if (subject === 'Leis' || subject === 'Provas Anteriores') return 'Provas Anteriores';
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
    else if (s.includes('RDPM')) displaySubject = 'RDPMMS';
  }
  return displaySubject;
};

export default function PerformancePage({ history, allSimulations, allUsers, profile, onUpgrade }: PerformancePageProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(profile.uid);
  const [selectedSubject, setSelectedSubject] = useState<string>('Geral');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    userHistory.forEach(sim => {
      if (sim.subjectScores) {
        Object.keys(sim.subjectScores).forEach(s => subjects.add(normalizeSubject(s)));
      }
    });
    return ['Geral', ...Array.from(subjects).sort()];
  }, [userHistory]);

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

  const minOverallScore = useMemo(() => {
    const validSimulations = allSimulations.filter(s => s.totalQuestions > 0 && !s.isMiniSimulado);
    if (validSimulations.length === 0) return 0;
    const scores = validSimulations.map(s => Math.round((s.score / s.totalQuestions) * 100));
    return Math.min(...scores);
  }, [allSimulations]);

  // 1. Performance by subject (Line Chart for selected subject)
  const subjectHistoryData = useMemo(() => {
    if (!selectedSubject) return [];
    
    if (selectedSubject === 'Geral') {
      return userHistory.filter(s => !s.isMiniSimulado).slice().reverse().map((sim, index) => {
        const date = sim.date?.toDate ? sim.date.toDate() : (sim.date?.seconds ? new Date(sim.date.seconds * 1000) : new Date());
        return {
          name: `Simulado ${index + 1}`,
          data: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          meuDesempenho: Math.round((sim.score / sim.totalQuestions) * 100),
          correct: sim.score,
          total: sim.totalQuestions
        };
      });
    }

    return userHistory.slice().reverse().filter(sim => {
        if (!sim.subjectScores) return false;
        return Object.keys(sim.subjectScores).some(s => normalizeSubject(s) === selectedSubject);
    }).map((sim, index) => {
      const date = sim.date?.toDate ? sim.date.toDate() : (sim.date?.seconds ? new Date(sim.date.seconds * 1000) : new Date());
      
      let correct = 0;
      let total = 0;
      Object.entries(sim.subjectScores || {}).forEach(([s, scores]) => {
          if (normalizeSubject(s) === selectedSubject) {
              const sc = scores as { correct: number; total: number };
              correct += sc.correct;
              total += sc.total;
          }
      });

      return {
        name: `Teste ${index + 1}`,
        data: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        meuDesempenho: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        total
      };
    });
  }, [selectedSubject, userHistory]);

  // Reference stats for the selected subject (or Geral)
  const referenceStats = useMemo(() => {
    if (!selectedSubject) return { mediaGeral: 0, melhorNota: 0, nota46: 0 };

    const otherSimulations = allSimulations.filter(s => s.userId !== selectedUserId);
    let scores: number[] = [];

    if (selectedSubject === 'Geral') {
      scores = otherSimulations.filter(s => !s.isMiniSimulado).map(s => Math.round((s.score / s.totalQuestions) * 100));
    } else {
      otherSimulations.forEach(sim => {
        if (sim.subjectScores) {
          Object.entries(sim.subjectScores).forEach(([s, sc]) => {
            if (normalizeSubject(s) === selectedSubject) {
              const scoresObj = sc as { correct: number; total: number };
              if (scoresObj.total > 0) {
                scores.push(Math.round((scoresObj.correct / scoresObj.total) * 100));
              }
            }
          });
        }
      });
    }

    if (scores.length === 0) return { mediaGeral: 0, melhorNota: 0, nota46: 0 };

    const sortedScores = [...scores].sort((a, b) => b - a);
    const mediaGeral = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const melhorNota = sortedScores[0];
    const nota46 = sortedScores.length >= 46 ? sortedScores[45] : sortedScores[sortedScores.length - 1];

    return { mediaGeral, melhorNota, nota46 };
  }, [selectedSubject, allSimulations, selectedUserId]);

  // 2. Overall Historical performance vs General Average
  const historicalData = useMemo(() => {
    const otherSimulations = allSimulations.filter(s => s.userId !== selectedUserId && !s.isMiniSimulado);
    const generalAverage = otherSimulations.length > 0 
      ? otherSimulations.reduce((acc, sim) => acc + ((sim.score / sim.totalQuestions) * 100), 0) / otherSimulations.length
      : 0;

    return userHistory.filter(s => !s.isMiniSimulado).slice().reverse().map((sim, index) => {
      const date = sim.date?.toDate ? sim.date.toDate() : (sim.date?.seconds ? new Date(sim.date.seconds * 1000) : new Date());
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-slate-800">Desempenho por Matéria</h3>
              
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-300 transition-all shadow-sm min-w-[200px]"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedSubject === 'Geral' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                    <span>{selectedSubject}</span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 mt-2 w-full min-w-[200px] bg-white border border-slate-100 rounded-2xl shadow-xl z-20 py-2 overflow-hidden"
                    >
                      {availableSubjects.map(subject => (
                        <button
                          key={subject}
                          onClick={() => {
                            setSelectedSubject(subject);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors flex items-center gap-3 ${
                            selectedSubject === subject 
                              ? 'bg-slate-50 text-indigo-600' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${subject === 'Geral' ? 'bg-emerald-500' : 'bg-indigo-500'} ${selectedSubject === subject ? 'opacity-100' : 'opacity-0'}`} />
                          {subject}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </div>

            {selectedSubject && mounted ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subjectHistoryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[minOverallScore, 100]} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === 'Meu Desempenho') {
                          return [`${value}% (${props.payload.correct}/${props.payload.total})`, name];
                        }
                        return [`${value}%`, name];
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="meuDesempenho" name="Meu Desempenho" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    
                    <ReferenceLine y={referenceStats.mediaGeral} stroke="#eab308" strokeDasharray="3 3" label={{ position: 'right', value: 'Média Geral', fill: '#eab308', fontSize: 10 }} />
                    <ReferenceLine y={referenceStats.melhorNota} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: 'Melhor Nota', fill: '#10b981', fontSize: 10 }} />
                    <ReferenceLine y={referenceStats.nota46} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '46ª Melhor', fill: '#ef4444', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-400">
                {selectedSubject ? 'Carregando gráfico...' : 'Selecione uma matéria para ver o desempenho histórico.'}
              </div>
            )}
          </motion.div>

          {/* Overall Historical Performance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Evolução Geral (% de Acertos)</h3>
            <div className="h-80 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="meuDesempenho" name="Meu Desempenho" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="mediaGeral" name="Média Geral" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Time per Question */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Tempo Médio por Questão</h3>
            <div className="h-64 w-full max-w-2xl mx-auto">
              {mounted && (
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
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
