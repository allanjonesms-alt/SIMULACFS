import React, { useState, useEffect, useCallback } from 'react';

export const MaintenancePage = () => {
  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    // Alvo: 3:00 AM UTC-4 = 07:00 AM UTC
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0));
    
    // Se o alvo já passou hoje, consideramos o próximo dia
    if (now.getTime() > target.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    
    return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  }, []);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
        <div className="flex justify-center mb-6">
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Contratempo no Banco de Dados</h1>
        <p className="text-slate-600 mb-6">
          Pedimos desculpas pelo ocorrido. Estamos trabalhando para resolver o problema o mais rápido possível.
        </p>
        <div className="text-4xl font-mono font-bold text-indigo-600 mb-6">
          {formatTime(timeLeft)}
        </div>
        <p className="text-sm text-slate-400">Previsão de retorno: 03:00 AM (UTC-4)</p>
      </div>
    </div>
  );
};
