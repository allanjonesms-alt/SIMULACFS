import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, CreditCard, Zap } from 'lucide-react';

interface UpgradePageProps {
  onBack: () => void;
  userId: string;
}

export default function UpgradePage({ onBack, userId }: UpgradePageProps) {
  const handlePayment = async (method: 'pix' | 'card') => {
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planName: 'Plano Premium - SimuProvas',
          amount: 19.90,
          paymentMethod: method,
        }),
      });

      const data = await response.json();
      if (data.init_point) {
        // Redirect to Mercado Pago checkout
        window.location.href = data.init_point;
      } else {
        alert('Erro ao iniciar pagamento.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Erro ao iniciar pagamento.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-2xl mx-auto p-6"
    >
      <button onClick={onBack} className="mb-6 text-slate-500 hover:text-slate-900 font-bold">
        ← Voltar
      </button>
      
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Upgrade para Premium</h2>
        <p className="text-slate-500 mb-8">
          Tenha acesso ilimitado a simulados e ranking.
        </p>
        
        <div className="text-5xl font-black text-slate-900 mb-8">R$ 19,90</div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-slate-700 font-medium">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            Acesso ilimitado a simulados
          </div>
          <div className="flex items-center gap-3 text-slate-700 font-medium">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            Ranking completo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => handlePayment('pix')}
            className="flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            Pagar com PIX
          </button>
          <button 
            onClick={() => handlePayment('card')}
            className="flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all"
          >
            <CreditCard className="w-5 h-5" />
            Cartão de Crédito
          </button>
        </div>
      </div>
    </motion.div>
  );
}
